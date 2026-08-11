import { Router } from 'express';
import authenticate from '../../../middleware/auth.middleware';
import { requireRole } from '../../../middleware/role.middleware';
import {
  createWarehouseHandler,
  getWarehouseHandler,
  listWarehousesHandler,
  updateWarehouseHandler
} from './warehouses.controller';

const router = Router();

// Same role decision as products.routes.ts: ADMIN + WAREHOUSE write, all authenticated roles read.
const READ_ROLES = ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'];
const WRITE_ROLES = ['ADMIN', 'WAREHOUSE'];

router.get('/', authenticate, requireRole(...READ_ROLES), listWarehousesHandler);
router.post('/', authenticate, requireRole(...WRITE_ROLES), createWarehouseHandler);
router.get('/:id', authenticate, requireRole(...READ_ROLES), getWarehouseHandler);
router.patch('/:id', authenticate, requireRole(...WRITE_ROLES), updateWarehouseHandler);

export default router;
