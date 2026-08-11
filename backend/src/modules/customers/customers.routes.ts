import { Router } from 'express';
import authenticate from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import {
  addFollowUpHandler,
  createCustomerHandler,
  getCustomerHandler,
  listCustomersHandler,
  updateCustomerHandler
} from './customers.controller';

const router = Router();

// Role assumptions (implementation decision, not dictated by the case study):
// - ADMIN: full customer management access.
// - SALES: owns customer relationships day-to-day, so full read/write access including follow-ups.
// - WAREHOUSE / ACCOUNTS: read-only access, since they may need customer context (e.g. for challans/
//   invoices) but have no business reason to create or edit customer records or follow-ups.
const READ_ROLES = ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'];
const WRITE_ROLES = ['ADMIN', 'SALES'];

router.get('/', authenticate, requireRole(...READ_ROLES), listCustomersHandler);
router.post('/', authenticate, requireRole(...WRITE_ROLES), createCustomerHandler);
router.get('/:id', authenticate, requireRole(...READ_ROLES), getCustomerHandler);
router.patch('/:id', authenticate, requireRole(...WRITE_ROLES), updateCustomerHandler);
router.post('/:id/follow-ups', authenticate, requireRole(...WRITE_ROLES), addFollowUpHandler);

export default router;
