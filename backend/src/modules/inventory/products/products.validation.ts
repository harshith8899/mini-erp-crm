import {
  CreateProductInput,
  CreateStockMovementInput,
  ListProductsQuery,
  MovementType,
  UpdateProductInput
} from './products.types';

const MOVEMENT_TYPES: MovementType[] = ['IN', 'OUT'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  if (trimmed.length < 2 || trimmed.length > 160) {
    errors.push('name must be between 2 and 160 characters');
    return undefined;
  }
  return trimmed;
}

function validateSku(sku: unknown, errors: string[]): string | undefined {
  if (!isNonEmptyString(sku)) {
    errors.push('sku is required');
    return undefined;
  }
  const trimmed = sku.trim();
  if (trimmed.length < 2 || trimmed.length > 80) {
    errors.push('sku must be between 2 and 80 characters');
    return undefined;
  }
  return trimmed;
}

function validateOptionalString(value: unknown, field: string, maxLength: number, errors: string[]): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string') {
    errors.push(`${field} must be a string`);
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    errors.push(`${field} must be at most ${maxLength} characters`);
    return undefined;
  }
  return trimmed;
}

function validateUnitPrice(value: unknown, errors: string[], required: boolean): number | undefined {
  if (value === undefined) {
    if (required) errors.push('unitPrice is required');
    return undefined;
  }
  const num = typeof value === 'string' ? Number(value) : value;
  if (typeof num !== 'number' || Number.isNaN(num) || !Number.isFinite(num) || num <= 0) {
    errors.push('unitPrice must be a positive number');
    return undefined;
  }
  return Math.round(num * 100) / 100;
}

function validateMinimumStockAlert(value: unknown, errors: string[]): number | undefined {
  if (value === undefined) return undefined;
  const num = typeof value === 'string' ? Number(value) : value;
  if (typeof num !== 'number' || !Number.isInteger(num) || num < 0) {
    errors.push('minimumStockAlert must be a non-negative integer');
    return undefined;
  }
  return num;
}

function validateOptionalWarehouseId(value: unknown, errors: string[]): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
    errors.push('warehouseId must be a valid identifier');
    return undefined;
  }
  return value;
}

function validateOptionalBoolean(value: unknown, field: string, errors: string[]): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  errors.push(`${field} must be a boolean`);
  return undefined;
}

// currentStock is intentionally never accepted here — it can only change via stock movements.
const FORBIDDEN_PRODUCT_FIELDS = ['id', 'currentStock', 'createdAt', 'updatedAt'];

export function validateCreateProduct(body: any): ValidationResult<CreateProductInput> {
  const errors: string[] = [];
  const b = body ?? {};

  for (const field of FORBIDDEN_PRODUCT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(b, field)) {
      errors.push(`${field} cannot be set directly`);
    }
  }

  const name = validateName(b.name, errors);
  const sku = validateSku(b.sku, errors);
  const category = validateOptionalString(b.category, 'category', 80, errors);
  const unitPrice = validateUnitPrice(b.unitPrice, errors, true);
  const minimumStockAlert = validateMinimumStockAlert(b.minimumStockAlert, errors);
  const warehouseId = validateOptionalWarehouseId(b.warehouseId, errors);
  const isActive = validateOptionalBoolean(b.isActive, 'isActive', errors);

  return {
    errors,
    data: {
      name: name ?? '',
      sku: sku ?? '',
      category,
      unitPrice: unitPrice ?? 0,
      minimumStockAlert,
      warehouseId,
      isActive
    }
  };
}

export function validateUpdateProduct(body: any): ValidationResult<UpdateProductInput> {
  const errors: string[] = [];
  const b = body ?? {};

  for (const field of FORBIDDEN_PRODUCT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(b, field)) {
      errors.push(`${field} cannot be modified directly — use a stock movement to change currentStock`);
    }
  }

  const data: UpdateProductInput = {};

  if (b.name !== undefined) {
    const name = validateName(b.name, errors);
    if (name !== undefined) data.name = name;
  }
  if (b.sku !== undefined) {
    const sku = validateSku(b.sku, errors);
    if (sku !== undefined) data.sku = sku;
  }
  if (b.category !== undefined) {
    const category = validateOptionalString(b.category, 'category', 80, errors);
    if (category !== undefined) data.category = category;
  }
  if (b.unitPrice !== undefined) {
    const unitPrice = validateUnitPrice(b.unitPrice, errors, false);
    if (unitPrice !== undefined) data.unitPrice = unitPrice;
  }
  if (b.minimumStockAlert !== undefined) {
    const minimumStockAlert = validateMinimumStockAlert(b.minimumStockAlert, errors);
    if (minimumStockAlert !== undefined) data.minimumStockAlert = minimumStockAlert;
  }
  if (b.warehouseId !== undefined) {
    const warehouseId = validateOptionalWarehouseId(b.warehouseId, errors);
    if (warehouseId !== undefined) data.warehouseId = warehouseId;
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

export function validateListProductsQuery(query: any): ValidationResult<ListProductsQuery> {
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

  let search: string | undefined;
  if (q.search !== undefined && q.search !== '') {
    if (typeof q.search !== 'string') {
      errors.push('search must be a string');
    } else {
      search = q.search.trim();
    }
  }

  let category: string | undefined;
  if (q.category !== undefined && q.category !== '') {
    if (typeof q.category !== 'string') {
      errors.push('category must be a string');
    } else {
      category = q.category.trim();
    }
  }

  let warehouseId: string | undefined;
  if (q.warehouseId !== undefined && q.warehouseId !== '') {
    if (typeof q.warehouseId !== 'string' || !UUID_REGEX.test(q.warehouseId)) {
      errors.push('warehouseId must be a valid identifier');
    } else {
      warehouseId = q.warehouseId;
    }
  }

  const isActive = validateOptionalBoolean(q.isActive, 'isActive', errors);

  return { errors, data: { page, limit, search, category, warehouseId, isActive } };
}

export function validateCreateStockMovement(body: any): ValidationResult<CreateStockMovementInput> {
  const errors: string[] = [];
  const b = body ?? {};

  let quantity = 0;
  const rawQuantity = typeof b.quantity === 'string' ? Number(b.quantity) : b.quantity;
  if (typeof rawQuantity !== 'number' || !Number.isFinite(rawQuantity) || !Number.isInteger(rawQuantity) || rawQuantity <= 0) {
    errors.push('quantity must be a positive integer');
  } else {
    quantity = rawQuantity;
  }

  let movementType: MovementType = 'IN';
  if (typeof b.movementType !== 'string' || !MOVEMENT_TYPES.includes(b.movementType as MovementType)) {
    errors.push(`movementType must be one of ${MOVEMENT_TYPES.join(', ')}`);
  } else {
    movementType = b.movementType as MovementType;
  }

  let reason = '';
  if (!isNonEmptyString(b.reason)) {
    errors.push('reason is required');
  } else if (b.reason.trim().length > 160) {
    errors.push('reason must be at most 160 characters');
  } else {
    reason = b.reason.trim();
  }

  return { errors, data: { quantity, movementType, reason } };
}
