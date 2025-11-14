import { Router } from 'express';

import {
  bulkUpdateVariants,
  exportInventoryCsv,
  getHostInventory,
  importInventoryCsv,
  updateVariantStock,
  uploadMiddleware
} from '../controllers/inventoryController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth, requireRole('host'));

router.get('/', getHostInventory);
router.get('/export', exportInventoryCsv);
router.get('/export-csv', exportInventoryCsv); // Legacy endpoint
router.post('/csv', uploadMiddleware, importInventoryCsv);
router.patch('/:variantId', updateVariantStock);
router.post('/bulk-update', bulkUpdateVariants);

export default router;

