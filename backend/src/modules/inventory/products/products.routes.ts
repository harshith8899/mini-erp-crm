import { Router } from 'express';
import authenticate from '../../../middleware/auth.middleware';
import { requireRole } from '../../../middleware/role.middleware';
import {
  addStockMovementHandler,
  createProductHandler,
  getProductHandler,
  listProductsHandler,
  listStockMovementsHandler,
  updateProductHandler
} from './products.controller';

const router = Router();

// Role decision (confirmed with the project owner — see chat, not dictated by the case study
// docs, which mark "Product management" / "Stock movement log" as unspecified for every role):
// - ADMIN + WAREHOUSE: full write access (create/edit products, record stock movements).
// - All authenticated roles (ADMIN, SALES, WAREHOUSE, ACCOUNTS): read access — Sales needs
//   stock visibility to build challans, Accounts needs pricing for invoicing.
const READ_ROLES = ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'];
const WRITE_ROLES = ['ADMIN', 'WAREHOUSE'];

router.get('/', authenticate, requireRole(...READ_ROLES), listProductsHandler);
router.post('/', authenticate, requireRole(...WRITE_ROLES), createProductHandler);
router.get('/:id', authenticate, requireRole(...READ_ROLES), getProductHandler);
router.patch('/:id', authenticate, requireRole(...WRITE_ROLES), updateProductHandler);
router.post('/:id/stock-movements', authenticate, requireRole(...WRITE_ROLES), addStockMovementHandler);
router.get('/:id/stock-movements', authenticate, requireRole(...READ_ROLES), listStockMovementsHandler);

export default router;
