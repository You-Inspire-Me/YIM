import { Router } from 'express';

import {
  getOrder,
  getRecentOrders,
  listOrders,
  updateOrderStatus
} from '../controllers/orderController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth, requireRole('host'));

router.get('/', listOrders);
router.get('/recent', getRecentOrders);
router.get('/:id', getOrder);
router.patch('/:id/status', updateOrderStatus);

export default router;

