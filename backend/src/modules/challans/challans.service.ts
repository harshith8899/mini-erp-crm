import prisma from '../../lib/prisma';
import {
  ChallanItemInput,
  CreateChallanInput,
  ListChallansQuery,
  UpdateChallanInput
} from './challans.types';

export class ChallanServiceError extends Error {
  code: string;
  meta?: Record<string, unknown>;

  constructor(code: string, message: string, meta?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.meta = meta;
  }
}

const CHALLAN_DETAIL_INCLUDE = {
  customer: {
    select: {
      id: true,
      name: true,
      businessName: true,
      mobile: true,
      email: true,
      gstNumber: true,
      address: true
    }
  },
  createdBy: { select: { id: true, name: true, email: true, role: true } },
  challanItems: {
    include: { product: { select: { id: true, name: true, sku: true, isActive: true } } }
  },
  stockMovements: {
    orderBy: { createdAt: 'desc' as const },
    include: { createdBy: { select: { id: true, name: true, email: true, role: true } } }
  }
};

function attachTotalAmount<T extends { challanItems: Array<{ lineTotal: unknown }> }>(challan: T) {
  const totalAmount = challan.challanItems.reduce((sum, item) => sum + Number(item.lineTotal), 0);
  return { ...challan, totalAmount: totalAmount.toFixed(2) };
}

async function getChallanDetail(client: any, id: string) {
  const challan = await client.challan.findUnique({ where: { id }, include: CHALLAN_DETAIL_INCLUDE });
  return challan ? attachTotalAmount(challan) : null;
}

// Challan numbers are generated as CH-000001, CH-000002, ... by reading the highest existing
// number and incrementing. Since we can't add a DB sequence without a migration, correctness
// under concurrent creates is provided by the retry loop in createChallan: if two requests
// compute the same "next" number, the unique constraint on challanNumber rejects the second
// insert (P2002), and that whole attempt is retried with a freshly-computed number.
async function generateNextChallanNumber(tx: any): Promise<string> {
  const last = await tx.challan.findFirst({
    where: { challanNumber: { startsWith: 'CH-' } },
    orderBy: { challanNumber: 'desc' },
    select: { challanNumber: true }
  });

  let nextSeq = 1;
  if (last) {
    const match = /^CH-(\d{6})$/.exec(last.challanNumber);
    if (match) nextSeq = parseInt(match[1], 10) + 1;
  }
  return `CH-${String(nextSeq).padStart(6, '0')}`;
}

function isChallanNumberConflict(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as any;
  if (e.code !== 'P2002') return false;
  // Prisma's P2002 `meta` shape differs by driver: classic engines put the field list at
  // `meta.target`; @prisma/adapter-pg nests it under `meta.driverAdapterError.cause.constraint`.
  // Search the whole meta blob rather than one fixed path so this holds under either shape.
  return JSON.stringify(e.meta ?? '').includes('challanNumber');
}

// Resolves the requested line items against live Product rows and builds the immutable
// snapshot data stored on ChallanItem. Used by both create and PATCH-while-DRAFT (item
// replacement). Failures here are treated as bad input (mapped to 400 by the controller),
// since this only ever runs against a client-submitted item list, not a state transition.
async function resolveItemsForCreate(tx: any, items: ChallanItemInput[]) {
  let totalQuantity = 0;
  // Typed loosely (matches this codebase's pragmatic style elsewhere, e.g. `req: any` in
  // controllers) because `tx` itself is untyped `any` — Prisma can't otherwise disambiguate
  // the checked vs. unchecked create-input union for a plain productId scalar.
  const itemsData: any[] = [];

  for (const item of items) {
    const product = await tx.product.findUnique({ where: { id: item.productId } });
    if (!product) {
      throw new ChallanServiceError('PRODUCT_NOT_FOUND', `productId ${item.productId} does not reference an existing product`);
    }
    if (!product.isActive) {
      throw new ChallanServiceError('PRODUCT_INACTIVE', `Product ${product.name} (SKU ${product.sku}) is not active`);
    }

    const unitPrice = Number(product.unitPrice);
    const lineTotal = Math.round(unitPrice * item.quantity * 100) / 100;
    totalQuantity += item.quantity;

    itemsData.push({
      productId: product.id,
      productNameSnapshot: product.name,
      productSkuSnapshot: product.sku,
      unitPriceSnapshot: product.unitPrice,
      quantity: item.quantity,
      lineTotal
    });
  }

  return { itemsData, totalQuantity };
}

// Shared by the dedicated POST /:id/confirm endpoint AND by createChallan when status=CONFIRMED
// is requested at creation time (same tx in that case, so a failure here rolls back the create
// too — see createChallan for why that's the intended all-or-nothing behavior).
//
// Every failure path here THROWS rather than returning an error value, specifically so that
// Postgres rolls back any deductions already applied to earlier line items in this same loop —
// a `return` would leave those earlier writes committed once the transaction closes normally.
async function performConfirmWithinTx(tx: any, challanId: string, userId?: string) {
  const challan = await tx.challan.findUnique({ where: { id: challanId }, include: { challanItems: true } });
  if (!challan) throw new ChallanServiceError('CHALLAN_NOT_FOUND', 'Challan not found');
  if (challan.status !== 'DRAFT') {
    throw new ChallanServiceError('NOT_DRAFT', `Only DRAFT challans can be confirmed (current status: ${challan.status})`);
  }

  // Atomic guard: only transitions if status is still DRAFT at UPDATE time. This is what
  // actually prevents two concurrent confirm requests from both succeeding (a plain read-then-
  // write would race; this re-evaluates the WHERE clause against the live row on write).
  const guard = await tx.challan.updateMany({
    where: { id: challanId, status: 'DRAFT' },
    data: { status: 'CONFIRMED', confirmedAt: new Date() }
  });
  if (guard.count === 0) {
    throw new ChallanServiceError('NOT_DRAFT', 'Challan status changed before confirmation could complete');
  }

  for (const item of challan.challanItems) {
    const product = await tx.product.findUnique({ where: { id: item.productId } });
    if (!product) {
      throw new ChallanServiceError('PRODUCT_NOT_FOUND', `Product ${item.productSkuSnapshot} no longer exists`);
    }
    if (!product.isActive) {
      throw new ChallanServiceError('PRODUCT_INACTIVE', `Product ${product.name} is no longer active`);
    }

    // Same atomic conditional-decrement pattern proven under concurrency in the Inventory
    // stock-movement endpoint: the WHERE clause is re-evaluated against the live row at UPDATE
    // time, so this can't race with another confirmation into negative stock.
    const deduction = await tx.product.updateMany({
      where: { id: item.productId, currentStock: { gte: item.quantity } },
      data: { currentStock: { decrement: item.quantity } }
    });
    if (deduction.count === 0) {
      throw new ChallanServiceError(
        'INSUFFICIENT_STOCK',
        `Insufficient stock for ${product.name} (SKU ${product.sku})`,
        { productId: item.productId }
      );
    }

    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        challanId: challan.id,
        quantity: item.quantity,
        movementType: 'OUT',
        reason: `Challan ${challan.challanNumber} confirmed`,
        createdById: userId ?? undefined
      }
    });
  }

  return getChallanDetail(tx, challanId);
}

const MAX_NUMBER_RETRIES = 5;

export async function createChallan(input: CreateChallanInput, userId?: string) {
  for (let attempt = 0; attempt < MAX_NUMBER_RETRIES; attempt++) {
    try {
      const challan = await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.findUnique({ where: { id: input.customerId } });
        if (!customer) {
          throw new ChallanServiceError('CUSTOMER_NOT_FOUND', 'customerId does not reference an existing customer');
        }

        const { itemsData, totalQuantity } = await resolveItemsForCreate(tx, input.items);
        const challanNumber = await generateNextChallanNumber(tx);

        const created = await tx.challan.create({
          data: {
            challanNumber,
            customerId: input.customerId,
            status: 'DRAFT',
            totalQuantity,
            createdById: userId ?? undefined,
            challanItems: { create: itemsData }
          }
        });

        // Creating "as CONFIRMED" is treated as one all-or-nothing operation: if stock
        // confirmation fails (e.g. insufficient stock), this throws, which rolls back the
        // challan creation too — nothing is persisted. This is a deliberate interpretation of
        // an ambiguous requirement (see docs/SALES_CHALLANS.md "Assumptions") since a POST that
        // partially succeeds (silently saving an unrequested Draft) is a worse API contract than
        // a POST that either fully succeeds or fully fails.
        if (input.status === 'CONFIRMED') {
          return performConfirmWithinTx(tx, created.id, userId);
        }

        return getChallanDetail(tx, created.id);
      });

      return { challan };
    } catch (err) {
      if (isChallanNumberConflict(err) && attempt < MAX_NUMBER_RETRIES - 1) continue;
      if (err instanceof ChallanServiceError) return { error: err };
      throw err;
    }
  }
  // Unreachable in practice (the loop always returns or throws) but keeps TS happy.
  throw new Error('Failed to generate a unique challan number after multiple attempts');
}

export async function listChallans(query: ListChallansQuery) {
  const { page, limit, status, customerId, search, dateFrom, dateTo } = query;

  const where: any = {};
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;
  if (search) where.challanNumber = { contains: search, mode: 'insensitive' };
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = dateFrom;
    if (dateTo) where.createdAt.lte = dateTo;
  }

  const [data, total] = await Promise.all([
    prisma.challan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { customer: { select: { id: true, name: true, businessName: true } } }
    }),
    prisma.challan.count({ where })
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages: total === 0 ? 0 : Math.ceil(total / limit) }
  };
}

export async function getChallanById(id: string) {
  return getChallanDetail(prisma, id);
}

export async function updateChallan(id: string, input: UpdateChallanInput) {
  try {
    const challan = await prisma.$transaction(async (tx) => {
      const existing = await tx.challan.findUnique({ where: { id } });
      if (!existing) throw new ChallanServiceError('CHALLAN_NOT_FOUND', 'Challan not found');
      if (existing.status !== 'DRAFT') {
        throw new ChallanServiceError('NOT_DRAFT', 'Only DRAFT challans can be edited');
      }

      if (input.customerId !== undefined) {
        const customer = await tx.customer.findUnique({ where: { id: input.customerId } });
        if (!customer) {
          throw new ChallanServiceError('CUSTOMER_NOT_FOUND', 'customerId does not reference an existing customer');
        }
      }

      let itemsUpdate: Record<string, unknown> = {};
      if (input.items !== undefined) {
        const { itemsData, totalQuantity } = await resolveItemsForCreate(tx, input.items);
        // Full replace: simplest correct semantics for a "repeatable line-item editor" UI,
        // and keeps this path reusing the exact same snapshot logic as create.
        await tx.challanItem.deleteMany({ where: { challanId: id } });
        itemsUpdate = { totalQuantity, challanItems: { create: itemsData } };
      }

      await tx.challan.update({
        where: { id },
        data: {
          ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
          ...itemsUpdate
        }
      });

      return getChallanDetail(tx, id);
    });

    return { challan };
  } catch (err) {
    if (err instanceof ChallanServiceError) return { error: err };
    throw err;
  }
}

export async function confirmChallan(id: string, userId?: string) {
  try {
    const challan = await prisma.$transaction((tx) => performConfirmWithinTx(tx, id, userId));
    return { challan };
  } catch (err) {
    if (err instanceof ChallanServiceError) return { error: err };
    throw err;
  }
}

export async function cancelChallan(id: string, userId?: string) {
  try {
    const challan = await prisma.$transaction(async (tx) => {
      const existing = await tx.challan.findUnique({ where: { id }, include: { challanItems: true } });
      if (!existing) throw new ChallanServiceError('CHALLAN_NOT_FOUND', 'Challan not found');
      if (existing.status === 'CANCELLED') {
        throw new ChallanServiceError('ALREADY_CANCELLED', 'Challan is already cancelled');
      }

      const wasConfirmed = existing.status === 'CONFIRMED';

      // Atomic guard against races (e.g. a concurrent confirm or a duplicate cancel request):
      // only proceeds if status is unchanged since our read above.
      const guard = await tx.challan.updateMany({
        where: { id, status: existing.status },
        data: { status: 'CANCELLED' }
      });
      if (guard.count === 0) {
        throw new ChallanServiceError('NOT_CANCELLABLE', 'Challan status changed before cancellation could complete');
      }

      if (wasConfirmed) {
        for (const item of existing.challanItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { increment: item.quantity } }
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              challanId: existing.id,
              quantity: item.quantity,
              movementType: 'IN',
              reason: `Challan ${existing.challanNumber} cancelled — stock reversal`,
              createdById: userId ?? undefined
            }
          });
        }
      }

      return getChallanDetail(tx, id);
    });

    return { challan };
  } catch (err) {
    if (err instanceof ChallanServiceError) return { error: err };
    throw err;
  }
}
