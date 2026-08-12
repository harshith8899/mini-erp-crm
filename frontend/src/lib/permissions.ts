import { UserRole } from '../types';

// Mirrors the WRITE_ROLES decision made (and confirmed) for backend customer routes:
// ADMIN + SALES can write, every authenticated role can read.
// This is a UI convenience only — the backend `requireRole` middleware is the actual
// enforcement point, not this check.
const CUSTOMER_WRITE_ROLES: UserRole[] = ['ADMIN', 'SALES'];

export function canWriteCustomers(role: UserRole | null | undefined): boolean {
  return Boolean(role && CUSTOMER_WRITE_ROLES.includes(role));
}

// Mirrors the WRITE_ROLES decision made (and confirmed) for backend inventory routes:
// ADMIN + WAREHOUSE can write, every authenticated role can read.
// This is a UI convenience only — the backend `requireRole` middleware is the actual
// enforcement point, not this check.
const INVENTORY_WRITE_ROLES: UserRole[] = ['ADMIN', 'WAREHOUSE'];

export function canWriteInventory(role: UserRole | null | undefined): boolean {
  return Boolean(role && INVENTORY_WRITE_ROLES.includes(role));
}

// Approved decision for Sales/Challans: ADMIN + SALES have full write access
// (create/edit-while-draft/confirm/cancel); WAREHOUSE/ACCOUNTS are read-only.
const CHALLAN_WRITE_ROLES: UserRole[] = ['ADMIN', 'SALES'];

export function canWriteChallans(role: UserRole | null | undefined): boolean {
  return Boolean(role && CHALLAN_WRITE_ROLES.includes(role));
}
