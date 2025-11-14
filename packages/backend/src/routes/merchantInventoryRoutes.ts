import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import { exportStockCsv, importStockCsv, uploadMiddleware } from '../controllers/merchantStockController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Merchant-only routes
router.use(requireAuth, requireRole('creator'));

// Stock CSV import/export
router.get('/export', exportStockCsv);
router.post('/import', (req, res, next) => {
  uploadMiddleware(req, res, (err) => {
    if (err) {
      console.error('[CSV Import] Multer error:', err);
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        message: err.message || 'File upload error' 
      });
    }
    next();
  });
}, importStockCsv);

export default router;

