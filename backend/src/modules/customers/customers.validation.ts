import {
  CreateCustomerInput,
  CreateFollowUpInput,
  CustomerStatus,
  CustomerType,
  ListCustomersQuery,
  UpdateCustomerInput
} from './customers.types';

const CUSTOMER_TYPES: CustomerType[] = ['RETAIL', 'WHOLESALE', 'DISTRIBUTOR'];
const CUSTOMER_STATUSES: CustomerStatus[] = ['LEAD', 'ACTIVE', 'INACTIVE'];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Accepts digits, spaces, +, -, () — 7 to 20 characters total.
const MOBILE_REGEX = /^[0-9+\-\s()]{7,20}$/;

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

function validateMobile(mobile: unknown, errors: string[]): string | undefined {
  if (!isNonEmptyString(mobile)) {
    errors.push('mobile is required');
    return undefined;
  }
  const trimmed = mobile.trim();
  if (!MOBILE_REGEX.test(trimmed)) {
    errors.push('mobile must be a valid phone number (digits, spaces, +, -, () only, 7-20 characters)');
    return undefined;
  }
  return trimmed;
}

function validateOptionalEmail(email: unknown, errors: string[]): string | null | undefined {
  if (email === undefined) return undefined;
  if (email === null || email === '') return null;
  if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push('email must be a valid email address');
    return undefined;
  }
  return email.trim();
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

function validateCustomerType(value: unknown, errors: string[], required: boolean): CustomerType | undefined {
  if (value === undefined) {
    if (required) errors.push('customerType is required');
    return undefined;
  }
  if (typeof value !== 'string' || !CUSTOMER_TYPES.includes(value as CustomerType)) {
    errors.push(`customerType must be one of ${CUSTOMER_TYPES.join(', ')}`);
    return undefined;
  }
  return value as CustomerType;
}

function validateCustomerStatus(value: unknown, errors: string[]): CustomerStatus | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !CUSTOMER_STATUSES.includes(value as CustomerStatus)) {
    errors.push(`status must be one of ${CUSTOMER_STATUSES.join(', ')}`);
    return undefined;
  }
  return value as CustomerStatus;
}

function validateOptionalDate(value: unknown, field: string, errors: string[]): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string' && !(value instanceof Date)) {
    errors.push(`${field} must be a valid date`);
    return undefined;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    errors.push(`${field} must be a valid date`);
    return undefined;
  }
  return date;
}

export function validateCreateCustomer(body: any): ValidationResult<CreateCustomerInput> {
  const errors: string[] = [];
  const b = body ?? {};

  const name = validateName(b.name, errors);
  const mobile = validateMobile(b.mobile, errors);
  const email = validateOptionalEmail(b.email, errors);
  const businessName = validateOptionalString(b.businessName, 'businessName', 160, errors);
  const gstNumber = validateOptionalString(b.gstNumber, 'gstNumber', 80, errors);
  const customerType = validateCustomerType(b.customerType, errors, true);
  const address = validateOptionalString(b.address, 'address', 500, errors);
  const status = validateCustomerStatus(b.status, errors);
  const followUpDate = validateOptionalDate(b.followUpDate, 'followUpDate', errors);
  const notes = validateOptionalString(b.notes, 'notes', 5000, errors);

  return {
    errors,
    data: {
      name: name ?? '',
      mobile: mobile ?? '',
      email,
      businessName,
      gstNumber,
      customerType: customerType ?? 'RETAIL',
      address,
      status,
      followUpDate,
      notes
    }
  };
}

const IMMUTABLE_FIELDS = ['id', 'createdAt', 'updatedAt', 'createdById', 'createdBy'];

export function validateUpdateCustomer(body: any): ValidationResult<UpdateCustomerInput> {
  const errors: string[] = [];
  const b = body ?? {};

  for (const field of IMMUTABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(b, field)) {
      errors.push(`${field} cannot be modified`);
    }
  }

  const data: UpdateCustomerInput = {};

  if (b.name !== undefined) {
    const name = validateName(b.name, errors);
    if (name !== undefined) data.name = name;
  }
  if (b.mobile !== undefined) {
    const mobile = validateMobile(b.mobile, errors);
    if (mobile !== undefined) data.mobile = mobile;
  }
  if (b.email !== undefined) {
    const email = validateOptionalEmail(b.email, errors);
    if (email !== undefined) data.email = email;
  }
  if (b.businessName !== undefined) {
    const businessName = validateOptionalString(b.businessName, 'businessName', 160, errors);
    if (businessName !== undefined) data.businessName = businessName;
  }
  if (b.gstNumber !== undefined) {
    const gstNumber = validateOptionalString(b.gstNumber, 'gstNumber', 80, errors);
    if (gstNumber !== undefined) data.gstNumber = gstNumber;
  }
  if (b.customerType !== undefined) {
    const customerType = validateCustomerType(b.customerType, errors, false);
    if (customerType !== undefined) data.customerType = customerType;
  }
  if (b.address !== undefined) {
    const address = validateOptionalString(b.address, 'address', 500, errors);
    if (address !== undefined) data.address = address;
  }
  if (b.status !== undefined) {
    const status = validateCustomerStatus(b.status, errors);
    if (status !== undefined) data.status = status;
  }
  if (b.followUpDate !== undefined) {
    const followUpDate = validateOptionalDate(b.followUpDate, 'followUpDate', errors);
    if (followUpDate !== undefined) data.followUpDate = followUpDate;
  }
  if (b.notes !== undefined) {
    const notes = validateOptionalString(b.notes, 'notes', 5000, errors);
    if (notes !== undefined) data.notes = notes;
  }

  if (Object.keys(data).length === 0 && errors.length === 0) {
    errors.push('at least one field must be supplied');
  }

  return { errors, data };
}

export function validateListQuery(query: any): ValidationResult<ListCustomersQuery> {
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

  let status: CustomerStatus | undefined;
  if (q.status !== undefined && q.status !== '') {
    if (typeof q.status !== 'string' || !CUSTOMER_STATUSES.includes(q.status as CustomerStatus)) {
      errors.push(`status must be one of ${CUSTOMER_STATUSES.join(', ')}`);
    } else {
      status = q.status as CustomerStatus;
    }
  }

  let customerType: CustomerType | undefined;
  if (q.type !== undefined && q.type !== '') {
    if (typeof q.type !== 'string' || !CUSTOMER_TYPES.includes(q.type as CustomerType)) {
      errors.push(`type must be one of ${CUSTOMER_TYPES.join(', ')}`);
    } else {
      customerType = q.type as CustomerType;
    }
  }

  return { errors, data: { page, limit, search, status, customerType } };
}

export function validateCreateFollowUp(body: any): ValidationResult<CreateFollowUpInput> {
  const errors: string[] = [];
  const b = body ?? {};

  const note = validateOptionalString(b.note, 'note', 5000, errors);
  if (note === undefined || note === null) {
    errors.push('note is required');
  }

  let followUpDate: Date;
  if (b.followUpDate === undefined || b.followUpDate === null || b.followUpDate === '') {
    followUpDate = new Date();
  } else {
    const parsed = validateOptionalDate(b.followUpDate, 'followUpDate', errors);
    followUpDate = parsed instanceof Date ? parsed : new Date();
  }

  return {
    errors,
    data: {
      note: note ?? '',
      followUpDate
    }
  };
}
