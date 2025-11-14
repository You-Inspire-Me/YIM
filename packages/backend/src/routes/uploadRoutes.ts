import { Router } from 'express';

import { uploadImage, uploadSingleImage } from '../controllers/uploadController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/image', requireAuth, requireRole('host'), uploadSingleImage, uploadImage);

export default router;

