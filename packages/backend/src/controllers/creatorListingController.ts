import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { AuthRequest } from '../middleware/authMiddleware.js';
import { CreatorListingModel } from '../models/CreatorListing.js';
import { ProductModel } from '../models/Product.js';
import { VariantModel } from '../models/Variant.js';

/**
 * Get all listings for a creator
 */
export const getCreatorListings = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const { productId, variantId, active, search } = req.query;

    const filter: Record<string, unknown> = {
      creatorId: req.user._id
    };

    if (productId) filter.productId = productId;
    if (variantId) filter.variantId = variantId;
    if (active !== undefined) filter.active = active === 'true';

    const listings = await CreatorListingModel.find(filter)
      .populate('productId')
      .populate('variantId')
      .sort({ createdAt: -1 })
      .lean();

    res.status(StatusCodes.OK).json({ listings });
  } catch (error) {
    console.error('Get creator listings error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to fetch listings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Create a new listing for a creator
 * Links a global product/variant to creator with own price/stock
 */
export const createCreatorListing = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const { productId, variantId, sku, priceExclVat, priceInclVat, stock, costPrice, supplier, active, posSystem, posSync, posExternalId } =
      req.body;

    // Verify product and variant exist
    const product = await ProductModel.findById(productId);
    if (!product) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Product not found' });
      return;
    }

    const variant = await VariantModel.findById(variantId);
    if (!variant) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Variant not found' });
      return;
    }

    // Check if listing already exists
    const existingListing = await CreatorListingModel.findOne({
      creatorId: req.user._id,
      productId,
      variantId
    });

    if (existingListing) {
      res.status(StatusCodes.CONFLICT).json({ message: 'Listing already exists for this product variant' });
      return;
    }

    // Calculate priceInclVat if not provided
    const vatRate = req.body.vatRate || 21;
    const calculatedPriceInclVat = priceInclVat || priceExclVat * (1 + vatRate / 100);

    const listing = await CreatorListingModel.create({
      creatorId: req.user._id,
      productId,
      variantId,
      sku: sku || `${product.sku}-${variant.size}-${variant.color}`,
      priceExclVat,
      priceInclVat: calculatedPriceInclVat,
      vatRate: vatRate,
      stock: stock || 0,
      costPrice,
      supplier,
      active: active !== undefined ? active : true,
      posSystem: req.body.posSystem || 'none',
      posSync: req.body.posSync || false,
      posExternalId: req.body.posExternalId
    });

    const populatedListing = await CreatorListingModel.findById(listing._id)
      .populate('productId')
      .populate('variantId')
      .lean();

    res.status(StatusCodes.CREATED).json({ listing: populatedListing });
  } catch (error) {
    console.error('Create creator listing error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to create listing',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Update creator listing
 */
export const updateCreatorListing = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const { id } = req.params;
    const updateData = req.body;

    const listing = await CreatorListingModel.findOne({
      _id: id,
      creatorId: req.user._id
    });

    if (!listing) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Listing not found' });
      return;
    }

    // Recalculate priceInclVat if priceExclVat or vatRate changed
    const vatRate = updateData.vatRate !== undefined ? updateData.vatRate : listing.vatRate || 21;
    if (updateData.priceExclVat && !updateData.priceInclVat) {
      updateData.priceInclVat = updateData.priceExclVat * (1 + vatRate / 100);
    }
    if (updateData.vatRate !== undefined && !updateData.priceInclVat) {
      updateData.priceInclVat = (listing.priceExclVat || 0) * (1 + vatRate / 100);
    }

    // Don't update variantId if it's invalid (like "/" or empty)
    if (updateData.variantId && (updateData.variantId === '/' || updateData.variantId.trim() === '')) {
      delete updateData.variantId;
    }

    // Only update fields that are provided and valid
    const fieldsToUpdate = ['priceExclVat', 'priceInclVat', 'vatRate', 'stock', 'costPrice', 'supplier', 'active', 'posSystem', 'posSync', 'posExternalId'];
    if (updateData.variantId && updateData.variantId !== '/' && updateData.variantId.trim() !== '') {
      fieldsToUpdate.push('variantId');
    }

    fieldsToUpdate.forEach(field => {
      if (updateData[field] !== undefined) {
        (listing as any)[field] = updateData[field];
      }
    });

    await listing.save();

    const populatedListing = await CreatorListingModel.findById(listing._id)
      .populate('productId')
      .populate('variantId')
      .lean();

    res.status(StatusCodes.OK).json({ listing: populatedListing });
  } catch (error) {
    console.error('Update creator listing error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to update listing',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Delete creator listing
 */
export const deleteCreatorListing = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const { id } = req.params;

    const listing = await CreatorListingModel.findOneAndDelete({
      _id: id,
      creatorId: req.user._id
    });

    if (!listing) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Listing not found' });
      return;
    }

    res.status(StatusCodes.OK).json({ message: 'Listing deleted' });
  } catch (error) {
    console.error('Delete creator listing error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to delete listing',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get available listings for a product variant
 * Used in checkout to find best price/stock
 */
export const getAvailableListings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId, variantId, quantity = 1 } = req.query;

    if (!productId || !variantId) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: 'productId and variantId required' });
      return;
    }

    const listings = await CreatorListingModel.find({
      productId,
      variantId,
      active: true,
      stock: { $gte: Number(quantity) }
    })
      .populate('productId')
      .populate('variantId')
      .populate('creatorId', 'profile.name')
      .sort({ priceInclVat: 1 }) // Sort by price ascending
      .lean();

    res.status(StatusCodes.OK).json({ listings });
  } catch (error) {
    console.error('Get available listings error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to fetch available listings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

