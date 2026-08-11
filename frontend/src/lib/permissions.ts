import { UserRole } from '../types';

// Mirrors the WRITE_ROLES decision made (and confirmed) for backend inventory routes:
// ADMIN + WAREHOUSE can write, every authenticated role can read.
// This is a UI convenience only — the backend `requireRole` middleware is the actual
// enforcement point, not this check.
const INVENTORY_WRITE_ROLES: UserRole[] = ['ADMIN', 'WAREHOUSE'];

export function canWriteInventory(role: UserRole | null | undefined): boolean {
  return Boolean(role && INVENTORY_WRITE_ROLES.includes(role));
}
