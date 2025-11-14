import { Router } from 'express';

import {
  createProduct,
  getProducts,
  searchProduct,
  updateProduct
} from '../controllers/productController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { processImages, uploadImages } from '../middleware/uploadMiddleware.js';

const router = Router();

router.get('/', requireAuth, requireRole('host'), getProducts);
router.get('/search', requireAuth, requireRole('host'), searchProduct);
router.post('/', requireAuth, requireRole('host'), uploadImages, processImages, createProduct);
router.patch('/:id', requireAuth, requireRole('host'), uploadImages, processImages, updateProduct);
// TODO: Add deleteProduct function to productController
// router.delete('/:id', requireAuth, requireRole('host'), deleteProduct);

export default router;
