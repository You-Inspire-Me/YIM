import { Router } from 'express';

import { posWebhook, syncPosStock, updatePosConfig } from '../controllers/posController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Public webhook endpoint (no auth required - uses API key verification)
router.post('/webhook', posWebhook);

// Creator-only routes
router.post('/sync', requireAuth, requireRole('creator'), syncPosStock);
router.put('/config', requireAuth, requireRole('creator'), updatePosConfig);

export default router;

