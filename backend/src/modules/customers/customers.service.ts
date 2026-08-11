import prisma from '../../lib/prisma';
import {
  CreateCustomerInput,
  CreateFollowUpInput,
  ListCustomersQuery,
  UpdateCustomerInput
} from './customers.types';

export async function listCustomers(query: ListCustomersQuery) {
  const { page, limit, search, status, customerType } = query;

  const where: any = {};
  if (status) where.status = status;
  if (customerType) where.customerType = customerType;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { businessName: { contains: search, mode: 'insensitive' } },
      { mobile: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.customer.count({ where })
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

export async function createCustomer(input: CreateCustomerInput, createdById?: string) {
  return prisma.customer.create({
    data: {
      name: input.name,
      mobile: input.mobile,
      email: input.email ?? undefined,
      businessName: input.businessName ?? undefined,
      gstNumber: input.gstNumber ?? undefined,
      customerType: input.customerType,
      address: input.address ?? undefined,
      status: input.status ?? undefined,
      followUpDate: input.followUpDate ?? undefined,
      notes: input.notes ?? undefined,
      createdById: createdById ?? undefined
    }
  });
}

export async function getCustomerById(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      customerFollowUps: {
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, name: true, email: true, role: true } }
        }
      }
    }
  });
}

export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) return null;

  return prisma.customer.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.mobile !== undefined ? { mobile: input.mobile } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.businessName !== undefined ? { businessName: input.businessName } : {}),
      ...(input.gstNumber !== undefined ? { gstNumber: input.gstNumber } : {}),
      ...(input.customerType !== undefined ? { customerType: input.customerType } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.followUpDate !== undefined ? { followUpDate: input.followUpDate } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {})
    }
  });
}

export async function addFollowUp(customerId: string, input: CreateFollowUpInput, createdById?: string) {
  const existing = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!existing) return null;

  const followUp = await prisma.customerFollowUp.create({
    data: {
      customerId,
      note: input.note,
      followUpDate: input.followUpDate,
      createdById: createdById ?? undefined
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true, role: true } }
    }
  });

  // Keep the customer's headline follow-up date in sync with the latest follow-up entry.
  await prisma.customer.update({
    where: { id: customerId },
    data: { followUpDate: input.followUpDate }
  });

  return followUp;
}
