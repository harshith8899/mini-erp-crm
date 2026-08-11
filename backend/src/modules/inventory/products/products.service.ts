import prisma from '../../../lib/prisma';
import {
  CreateProductInput,
  CreateStockMovementInput,
  ListProductsQuery,
  UpdateProductInput
} from './products.types';

export const SKU_CONFLICT = 'SKU_CONFLICT';
export const WAREHOUSE_NOT_FOUND = 'WAREHOUSE_NOT_FOUND';

export async function listProducts(query: ListProductsQuery) {
  const { page, limit, search, category, warehouseId, isActive } = query;

  const where: any = {};
  if (category) where.category = category;
  if (warehouseId) where.warehouseId = warehouseId;
  if (isActive !== undefined) where.isActive = isActive;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { warehouse: { select: { id: true, name: true, location: true } } }
    }),
    prisma.product.count({ where })
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit)
    }
  };
}

async function assertWarehouseExists(warehouseId: string | null | undefined) {
  if (!warehouseId) return true;
  const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
  return Boolean(warehouse);
}

export async function createProduct(input: CreateProductInput, _createdById?: string) {
  const warehouseOk = await assertWarehouseExists(input.warehouseId);
  if (!warehouseOk) return { error: WAREHOUSE_NOT_FOUND } as const;

  const existingSku = await prisma.product.findUnique({ where: { sku: input.sku } });
  if (existingSku) return { error: SKU_CONFLICT } as const;

  const product = await prisma.product.create({
    data: {
      name: input.name,
      sku: input.sku,
      category: input.category ?? undefined,
      unitPrice: input.unitPrice,
      minimumStockAlert: input.minimumStockAlert ?? undefined,
      warehouseId: input.warehouseId ?? undefined,
      isActive: input.isActive ?? undefined
    },
    include: { warehouse: { select: { id: true, name: true, location: true } } }
  });

  return { product };
}

export async function getProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      warehouse: { select: { id: true, name: true, location: true } },
      stockMovements: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { createdBy: { select: { id: true, name: true, email: true, role: true } } }
      }
    }
  });
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return { error: 'NOT_FOUND' } as const;

  const warehouseOk = await assertWarehouseExists(input.warehouseId);
  if (!warehouseOk) return { error: WAREHOUSE_NOT_FOUND } as const;

  if (input.sku !== undefined && input.sku !== existing.sku) {
    const existingSku = await prisma.product.findUnique({ where: { sku: input.sku } });
    if (existingSku) return { error: SKU_CONFLICT } as const;
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.sku !== undefined ? { sku: input.sku } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.unitPrice !== undefined ? { unitPrice: input.unitPrice } : {}),
      ...(input.minimumStockAlert !== undefined ? { minimumStockAlert: input.minimumStockAlert } : {}),
      ...(input.warehouseId !== undefined ? { warehouseId: input.warehouseId } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {})
    },
    include: { warehouse: { select: { id: true, name: true, location: true } } }
  });

  return { product };
}

export async function addStockMovement(productId: string, input: CreateStockMovementInput, createdById?: string) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) return { ok: false, reason: 'PRODUCT_NOT_FOUND' } as const;
    if (!product.isActive) return { ok: false, reason: 'PRODUCT_INACTIVE' } as const;

    if (input.movementType === 'OUT') {
      // Atomic conditional decrement: the WHERE clause is re-evaluated against the row's
      // live value at UPDATE time, so this cannot race with a concurrent OUT movement into
      // a negative balance the way a read-then-write check would.
      const result = await tx.product.updateMany({
        where: { id: productId, currentStock: { gte: input.quantity } },
        data: { currentStock: { decrement: input.quantity } }
      });
      if (result.count === 0) return { ok: false, reason: 'INSUFFICIENT_STOCK' } as const;
    } else {
      await tx.product.update({
        where: { id: productId },
        data: { currentStock: { increment: input.quantity } }
      });
    }

    const movement = await tx.stockMovement.create({
      data: {
        productId,
        quantity: input.quantity,
        movementType: input.movementType,
        reason: input.reason,
        createdById: createdById ?? undefined
      },
      include: { createdBy: { select: { id: true, name: true, email: true, role: true } } }
    });

    const updatedProduct = await tx.product.findUnique({
      where: { id: productId },
      include: { warehouse: { select: { id: true, name: true, location: true } } }
    });

    return { ok: true, movement, product: updatedProduct } as const;
  });
}

export async function listStockMovements(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return null;

  const movements = await prisma.stockMovement.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { id: true, name: true, email: true, role: true } } }
  });

  return movements;
}
