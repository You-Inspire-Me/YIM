import { Router } from 'express';

import {
  createCreatorListing,
  deleteCreatorListing,
  getAvailableListings,
  getCreatorListings,
  updateCreatorListing
} from '../controllers/creatorListingController.js';
import {
  exportCreatorListingCsv,
  importCreatorListingCsv,
  uploadMiddleware
} from '../controllers/creatorListingCsvController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// All routes require authentication and creator role
router.use(requireAuth, requireRole('creator'));

// Get available listings (public - for checkout)
router.get('/available', getAvailableListings);

// CSV import/export
router.get('/export', exportCreatorListingCsv);
router.post('/import', uploadMiddleware, importCreatorListingCsv);

// Creator's own listings
router.get('/', getCreatorListings);
router.post('/', createCreatorListing);
router.put('/:id', updateCreatorListing);
router.delete('/:id', deleteCreatorListing);

export default router;

