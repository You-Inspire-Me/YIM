import { Router } from 'express';

import { getPublicLook, getPublicLooks } from '../controllers/lookController.js';

const router = Router();

// Public routes (no authentication required)
router.get('/looks', getPublicLooks);
router.get('/looks/:id', getPublicLook);

export default router;

