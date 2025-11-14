import { Router } from 'express';

import { getPublicLook, getPublicLooks, likeLook } from '../controllers/lookController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Public routes (no authentication required)
router.get('/looks', getPublicLooks);
router.get('/looks/:id', getPublicLook);
// Like route (requires auth)
router.post('/looks/:id/like', requireAuth, likeLook);

export default router;

