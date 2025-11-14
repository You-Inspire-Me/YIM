import { Router } from 'express';

import {
  getAnalytics,
  getDashboardStats,
  getRevenueChart,
  getTopProducts
} from '../controllers/hostController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth, requireRole('host'));

router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/revenue', getRevenueChart);
router.get('/dashboard/top-products', getTopProducts);
router.get('/analytics', getAnalytics);

export default router;

