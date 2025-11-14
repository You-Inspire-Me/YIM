import { Router } from 'express';

import { lookupEAN } from '../controllers/icecatController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Public route for both creator and host
router.get('/lookup', requireAuth, lookupEAN);

export default router;

