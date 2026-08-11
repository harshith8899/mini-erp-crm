import prisma from '../../../lib/prisma';
import { CreateWarehouseInput, ListWarehousesQuery, UpdateWarehouseInput } from './warehouses.types';

export const NAME_CONFLICT = 'NAME_CONFLICT';

export async function listWarehouses(query: ListWarehousesQuery) {
  const { page, limit, search, isActive } = query;

  const where: any = {};
  if (isActive !== undefined) where.isActive = isActive;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [data, total] = await Promise.all([
    prisma.warehouse.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.warehouse.count({ where })
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

export async function createWarehouse(input: CreateWarehouseInput) {
  const existing = await prisma.warehouse.findUnique({ where: { name: input.name } });
  if (existing) return { error: NAME_CONFLICT } as const;

  const warehouse = await prisma.warehouse.create({
    data: {
      name: input.name,
      location: input.location,
      isActive: input.isActive ?? undefined
    }
  });

  return { warehouse };
}

export async function getWarehouseById(id: string) {
  return prisma.warehouse.findUnique({
    where: { id },
    include: {
      products: {
        select: { id: true, name: true, sku: true, currentStock: true, isActive: true },
        orderBy: { name: 'asc' }
      }
    }
  });
}

export async function updateWarehouse(id: string, input: UpdateWarehouseInput) {
  const existing = await prisma.warehouse.findUnique({ where: { id } });
  if (!existing) return { error: 'NOT_FOUND' } as const;

  if (input.name !== undefined && input.name !== existing.name) {
    const nameConflict = await prisma.warehouse.findUnique({ where: { name: input.name } });
    if (nameConflict) return { error: NAME_CONFLICT } as const;
  }

  const warehouse = await prisma.warehouse.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {})
    }
  });

  return { warehouse };
}
