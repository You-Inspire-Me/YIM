import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { AuthRequest } from '../middleware/authMiddleware.js';
import { CreatorListingModel } from '../models/CreatorListing.js';
import { UserModel } from '../models/User.js';

/**
 * Sync stock from POS system
 * This is a stub - actual POS API integration would go here
 */
export const syncPosStock = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const { posSystem, apiKey, storeId } = req.body;

    if (!posSystem || posSystem === 'none') {
      res.status(StatusCodes.BAD_REQUEST).json({ message: 'POS system not configured' });
      return;
    }

    // Get all listings for this creator that have POS sync enabled
    const listings = await CreatorListingModel.find({
      creatorId: req.user._id,
      posSystem,
      posSync: true
    }).populate('productId').populate('variantId');

    let synced = 0;
    let errors = 0;

    // TODO: Implement actual POS API calls
    // For now, this is a placeholder
    for (const listing of listings) {
      try {
        // Example: Fetch stock from POS API
        // const posStock = await fetchPosStock(posSystem, apiKey, storeId, listing.posExternalId);
        // listing.stock = posStock;
        // listing.lastPosSync = new Date();
        // await listing.save();
        synced++;
      } catch (error) {
        console.error(`Error syncing listing ${listing._id}:`, error);
        errors++;
      }
    }

    res.status(StatusCodes.OK).json({
      message: `POS sync completed: ${synced} listings synced${errors > 0 ? `, ${errors} errors` : ''}`,
      synced,
      errors
    });
  } catch (error) {
    console.error('POS sync error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to sync POS stock',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Webhook endpoint for POS systems to push stock updates
 */
export const posWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { posSystem, externalId, stock, apiKey } = req.body;

    // TODO: Verify webhook signature/API key
    // For now, this is a placeholder

    // Find listing by POS external ID
    const listing = await CreatorListingModel.findOne({
      posSystem,
      posExternalId: externalId
    });

    if (!listing) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Listing not found' });
      return;
    }

    // Update stock
    listing.stock = stock;
    listing.lastPosSync = new Date();
    await listing.save();

    res.status(StatusCodes.OK).json({ message: 'Stock updated', listingId: listing._id });
  } catch (error) {
    console.error('POS webhook error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to process webhook',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Update creator's POS configuration
 */
export const updatePosConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const { posSystem, apiKey, storeId } = req.body;

    // Update user profile with POS config (if needed)
    // For now, POS config is stored per listing

    res.status(StatusCodes.OK).json({ message: 'POS configuration updated' });
  } catch (error) {
    console.error('Update POS config error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to update POS configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

