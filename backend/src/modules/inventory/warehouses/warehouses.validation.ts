import { CreateWarehouseInput, ListWarehousesQuery, UpdateWarehouseInput } from './warehouses.types';

export interface ValidationResult<T> {
  errors: string[];
  data: T;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateName(name: unknown, errors: string[]): string | undefined {
  if (!isNonEmptyString(name)) {
    errors.push('name is required');
    return undefined;
  }
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 120) {
    errors.push('name must be between 2 and 120 characters');
    return undefined;
  }
  return trimmed;
}

function validateLocation(location: unknown, errors: string[], required: boolean): string | undefined {
  if (location === undefined || location === '') {
    if (required) errors.push('location is required');
    return undefined;
  }
  if (typeof location !== 'string') {
    errors.push('location must be a string');
    return undefined;
  }
  const trimmed = location.trim();
  if (trimmed.length < 2 || trimmed.length > 160) {
    errors.push('location must be between 2 and 160 characters');
    return undefined;
  }
  return trimmed;
}

function validateOptionalBoolean(value: unknown, field: string, errors: string[]): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  errors.push(`${field} must be a boolean`);
  return undefined;
}

const FORBIDDEN_FIELDS = ['id', 'createdAt', 'updatedAt'];

export function validateCreateWarehouse(body: any): ValidationResult<CreateWarehouseInput> {
  const errors: string[] = [];
  const b = body ?? {};

  for (const field of FORBIDDEN_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(b, field)) {
      errors.push(`${field} cannot be set directly`);
    }
  }

  const name = validateName(b.name, errors);
  const location = validateLocation(b.location, errors, true);
  const isActive = validateOptionalBoolean(b.isActive, 'isActive', errors);

  return {
    errors,
    data: { name: name ?? '', location: location ?? '', isActive }
  };
}

export function validateUpdateWarehouse(body: any): ValidationResult<UpdateWarehouseInput> {
  const errors: string[] = [];
  const b = body ?? {};

  for (const field of FORBIDDEN_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(b, field)) {
      errors.push(`${field} cannot be modified`);
    }
  }

  const data: UpdateWarehouseInput = {};

  if (b.name !== undefined) {
    const name = validateName(b.name, errors);
    if (name !== undefined) data.name = name;
  }
  if (b.location !== undefined) {
    const location = validateLocation(b.location, errors, false);
    if (location !== undefined) data.location = location;
  }
  if (b.isActive !== undefined) {
    const isActive = validateOptionalBoolean(b.isActive, 'isActive', errors);
    if (isActive !== undefined) data.isActive = isActive;
  }

  if (Object.keys(data).length === 0 && errors.length === 0) {
    errors.push('at least one field must be supplied');
  }

  return { errors, data };
}

export function validateListWarehousesQuery(query: any): ValidationResult<ListWarehousesQuery> {
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

  let limit = 50;
  if (q.limit !== undefined) {
    const parsed = Number(q.limit);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
      errors.push('limit must be an integer between 1 and 100');
    } else {
      limit = parsed;
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

  const isActive = validateOptionalBoolean(q.isActive, 'isActive', errors);

  return { errors, data: { page, limit, search, isActive } };
}
