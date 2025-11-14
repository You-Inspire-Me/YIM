import { Router } from 'express';

import {
  createProductMaster,
  getProductMasterById,
  getProductMasters,
  updateProductMaster
} from '../controllers/productMasterController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Public routes - anyone can view published products
router.get('/', getProductMasters);
router.get('/:id', getProductMasterById);

// Creator-only routes - create/update products
router.use(requireAuth, requireRole('creator'));

router.post('/', createProductMaster);
router.put('/:id', updateProductMaster);

export default router;

