import { Router } from 'express';

import {
  createProduct,
  getProduct,
  getProducts,
  searchProduct,
  updateProduct
} from '../controllers/productController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Public routes
router.get('/', getProducts);
router.get('/search', searchProduct);
router.get('/:id', getProduct);

// Creator-only routes (for creating/updating global products)
router.post('/', requireAuth, requireRole('creator'), createProduct);
router.put('/:id', requireAuth, requireRole('creator'), updateProduct);

export default router;

