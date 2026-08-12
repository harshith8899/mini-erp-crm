import {
  ChallanItemInput,
  ChallanStatusValue,
  CreateChallanInput,
  ListChallansQuery,
  UpdateChallanInput
} from './challans.types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CREATE_STATUSES: Array<'DRAFT' | 'CONFIRMED'> = ['DRAFT', 'CONFIRMED'];
const ALL_STATUSES: ChallanStatusValue[] = ['DRAFT', 'CONFIRMED', 'CANCELLED'];

export interface ValidationResult<T> {
  errors: string[];
  data: T;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateCustomerId(value: unknown, errors: string[], required: boolean): string | undefined {
  if (value === undefined) {
    if (required) errors.push('customerId is required');
    return undefined;
  }
  if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
    errors.push('customerId must be a valid identifier');
    return undefined;
  }
  return value;
}

function validateItems(value: unknown, errors: string[], required: boolean): ChallanItemInput[] | undefined {
  if (value === undefined) {
    if (required) errors.push('items is required');
    return undefined;
  }
  if (!Array.isArray(value) || value.length === 0) {
    errors.push('items must be a non-empty array');
    return undefined;
  }

  const items: ChallanItemInput[] = [];
  const seenProductIds = new Set<string>();
  const duplicates = new Set<string>();
  let itemsValid = true;

  value.forEach((raw, index) => {
    const item = raw ?? {};
    const productId = item.productId;
    const quantity = typeof item.quantity === 'string' ? Number(item.quantity) : item.quantity;

    if (typeof productId !== 'string' || !UUID_REGEX.test(productId)) {
      errors.push(`items[${index}].productId must be a valid identifier`);
      itemsValid = false;
      return;
    }
    if (typeof quantity !== 'number' || !Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity <= 0) {
      errors.push(`items[${index}].quantity must be a positive integer`);
      itemsValid = false;
      return;
    }

    if (seenProductIds.has(productId)) {
      duplicates.add(productId);
    }
    seenProductIds.add(productId);
    items.push({ productId, quantity });
  });

  if (duplicates.size > 0) {
    errors.push(`a product may only appear once per challan (duplicated: ${Array.from(duplicates).join(', ')})`);
    itemsValid = false;
  }

  return itemsValid ? items : undefined;
}

function validateCreateStatus(value: unknown, errors: string[]): 'DRAFT' | 'CONFIRMED' {
  if (value === undefined) return 'DRAFT';
  if (typeof value !== 'string' || !CREATE_STATUSES.includes(value as 'DRAFT' | 'CONFIRMED')) {
    errors.push('status must be DRAFT or CONFIRMED when creating a challan');
    return 'DRAFT';
  }
  return value as 'DRAFT' | 'CONFIRMED';
}

const FORBIDDEN_CREATE_FIELDS = ['id', 'challanNumber', 'createdAt', 'updatedAt', 'confirmedAt', 'createdById', 'totalQuantity'];
const FORBIDDEN_UPDATE_FIELDS = [...FORBIDDEN_CREATE_FIELDS, 'status'];

export function validateCreateChallan(body: any): ValidationResult<CreateChallanInput> {
  const errors: string[] = [];
  const b = body ?? {};

  for (const field of FORBIDDEN_CREATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(b, field)) {
      errors.push(`${field} cannot be set directly`);
    }
  }

  const customerId = validateCustomerId(b.customerId, errors, true);
  const status = validateCreateStatus(b.status, errors);
  const items = validateItems(b.items, errors, true);

  return {
    errors,
    data: { customerId: customerId ?? '', status, items: items ?? [] }
  };
}

export function validateUpdateChallan(body: any): ValidationResult<UpdateChallanInput> {
  const errors: string[] = [];
  const b = body ?? {};

  for (const field of FORBIDDEN_UPDATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(b, field)) {
      errors.push(
        field === 'status'
          ? 'status cannot be set via PATCH — use /confirm or /cancel'
          : `${field} cannot be modified`
      );
    }
  }

  const data: UpdateChallanInput = {};

  if (b.customerId !== undefined) {
    const customerId = validateCustomerId(b.customerId, errors, false);
    if (customerId !== undefined) data.customerId = customerId;
  }
  if (b.items !== undefined) {
    const items = validateItems(b.items, errors, false);
    if (items !== undefined) data.items = items;
  }

  if (Object.keys(data).length === 0 && errors.length === 0) {
    errors.push('at least one field (customerId or items) must be supplied');
  }

  return { errors, data };
}

export function validateListChallansQuery(query: any): ValidationResult<ListChallansQuery> {
  const errors: string[] = [];
  const q = query ?? {};

  let page = 1;
  if (q.page !== undefined) {
    const parsed = Number(q.page);
    if (!Number.isInteger(parsed) || parsed < 1) {
      errors.push('page must be a positive integer');
    } else {
      page = parsed;
    }
  }

  let limit = 10;
  if (q.limit !== undefined) {
    const parsed = Number(q.limit);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
      errors.push('limit must be an integer between 1 and 100');
    } else {
      limit = parsed;
    }
  }

  let status: ChallanStatusValue | undefined;
  if (q.status !== undefined && q.status !== '') {
    if (typeof q.status !== 'string' || !ALL_STATUSES.includes(q.status as ChallanStatusValue)) {
      errors.push(`status must be one of ${ALL_STATUSES.join(', ')}`);
    } else {
      status = q.status as ChallanStatusValue;
    }
  }

  let customerId: string | undefined;
  if (q.customerId !== undefined && q.customerId !== '') {
    if (typeof q.customerId !== 'string' || !UUID_REGEX.test(q.customerId)) {
      errors.push('customerId must be a valid identifier');
    } else {
      customerId = q.customerId;
    }
  }

  let search: string | undefined;
  if (q.search !== undefined && q.search !== '') {
    if (typeof q.search !== 'string') {
      errors.push('search must be a string');
    } else {
      search = q.search.trim();
    }
  }

  let dateFrom: Date | undefined;
  if (q.dateFrom !== undefined && q.dateFrom !== '') {
    const parsed = new Date(q.dateFrom);
    if (Number.isNaN(parsed.getTime())) {
      errors.push('dateFrom must be a valid date');
    } else {
      dateFrom = parsed;
    }
  }

  let dateTo: Date | undefined;
  if (q.dateTo !== undefined && q.dateTo !== '') {
    const parsed = new Date(q.dateTo);
    if (Number.isNaN(parsed.getTime())) {
      errors.push('dateTo must be a valid date');
    } else {
      dateTo = parsed;
    }
  }

  return { errors, data: { page, limit, status, customerId, search, dateFrom, dateTo } };
}
