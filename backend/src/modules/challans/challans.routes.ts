import { Router } from 'express';
import authenticate from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import {
  cancelChallanHandler,
  confirmChallanHandler,
  createChallanHandler,
  getChallanHandler,
  listChallansHandler,
  updateChallanHandler
} from './challans.controller';

const router = Router();

// Approved role decisions for Sales/Challans:
// - ADMIN + SALES: full access (view/create/edit-while-draft/confirm/cancel).
// - WAREHOUSE + ACCOUNTS: view only.
const READ_ROLES = ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'];
const WRITE_ROLES = ['ADMIN', 'SALES'];

router.get('/', authenticate, requireRole(...READ_ROLES), listChallansHandler);
router.post('/', authenticate, requireRole(...WRITE_ROLES), createChallanHandler);
router.get('/:id', authenticate, requireRole(...READ_ROLES), getChallanHandler);
router.patch('/:id', authenticate, requireRole(...WRITE_ROLES), updateChallanHandler);
router.post('/:id/confirm', authenticate, requireRole(...WRITE_ROLES), confirmChallanHandler);
router.post('/:id/cancel', authenticate, requireRole(...WRITE_ROLES), cancelChallanHandler);

export default router;
