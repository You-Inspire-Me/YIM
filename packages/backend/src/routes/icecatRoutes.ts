import { Router } from 'express';

import { lookupEAN } from '../controllers/icecatController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Creator-only routes
router.use(requireAuth, requireRole('creator'));

router.get('/lookup', lookupEAN);

export default router;

