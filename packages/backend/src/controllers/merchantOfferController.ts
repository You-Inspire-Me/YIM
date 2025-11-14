import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { AuthRequest } from '../middleware/authMiddleware.js';
import { MerchantOfferModel } from '../models/MerchantOffer.js';
import { MerchantModel } from '../models/Merchant.js';
import { ProductVariantModel } from '../models/ProductVariant.js';
import { MerchantPriceModel } from '../models/MerchantPrice.js';
import { MerchantStockModel } from '../models/MerchantStock.js';
import { LocationModel } from '../models/Location.js';

/**
 * Get all offers for a merchant
 */
export const getMerchantOffers = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    // Find merchant for this user
    const merchant = await MerchantModel.findOne({ merchantId: req.user._id });
    if (!merchant) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Merchant not found' });
      return;
    }

    const { status, variantId } = req.query;

    const filter: Record<string, unknown> = {
      merchantId: merchant._id
    };

    if (status) filter.status = status;
    if (variantId) filter.variantId = variantId;

    const offers = await MerchantOfferModel.find(filter)
      .populate({
        path: 'variantId',
        populate: {
          path: 'masterId',
          select: 'title modelId brandId'
        }
      })
      .populate('merchantId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // Get prices and stock for each offer
    const offersWithDetails = await Promise.all(
      offers.map(async (offer: any) => {
        const [currentPrice, stocks] = await Promise.all([
          MerchantPriceModel.findOne({
            offerId: offer._id,
            validFrom: { $lte: new Date() },
            $or: [{ validTo: { $gte: new Date() } }, { validTo: null }]
          }).sort({ validFrom: -1 }).lean(),
          MerchantStockModel.find({ offerId: offer._id }).populate('locationId').lean()
        ]);

        const totalStock = stocks.reduce((sum: number, stock: any) => sum + (stock.availableQty || 0), 0);

        return {
          ...offer,
          price: currentPrice,
          stocks,
          totalStock
        };
      })
    );

    res.status(StatusCodes.OK).json({ offers: offersWithDetails });
  } catch (error) {
    console.error('Get merchant offers error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to fetch offers',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Create a new merchant offer
 */
export const createMerchantOffer = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const { variantId, merchantSku, listingCountries, basePrice, stock, locationId } = req.body;

    // Find merchant
    const merchant = await MerchantModel.findOne({ merchantId: req.user._id });
    if (!merchant) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Merchant not found' });
      return;
    }

    // Verify variant exists
    const variant = await ProductVariantModel.findById(variantId);
    if (!variant) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Variant not found' });
      return;
    }

    // Check if offer already exists
    const existingOffer = await MerchantOfferModel.findOne({
      merchantId: merchant._id,
      variantId
    });

    if (existingOffer) {
      res.status(StatusCodes.CONFLICT).json({ message: 'Offer already exists for this variant' });
      return;
    }

    // Create offer
    const offer = await MerchantOfferModel.create({
      merchantId: merchant._id,
      variantId,
      merchantSku: merchantSku || variant.sku,
      status: 'active',
      listingCountries: listingCountries || ['NL']
    });

    // Create price if provided
    if (basePrice) {
      await MerchantPriceModel.create({
        offerId: offer._id,
        currency: 'EUR',
        basePrice,
        effectivePrice: basePrice,
        validFrom: new Date(),
        source: 'merchant'
      });
    }

    // Create stock if provided
    if (stock !== undefined && locationId) {
      await MerchantStockModel.create({
        offerId: offer._id,
        locationId,
        availableQty: stock,
        incomingQty: 0,
        reservedQty: 0
      });
    }

    const populatedOffer = await MerchantOfferModel.findById(offer._id)
      .populate({
        path: 'variantId',
        populate: { path: 'masterId', select: 'title modelId brandId' }
      })
      .lean();

    res.status(StatusCodes.CREATED).json({ offer: populatedOffer });
  } catch (error) {
    console.error('Create merchant offer error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to create offer',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Update merchant offer
 */
export const updateMerchantOffer = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const { id } = req.params;
    const updateData = req.body;

    // Find merchant
    const merchant = await MerchantModel.findOne({ merchantId: req.user._id });
    if (!merchant) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Merchant not found' });
      return;
    }

    const offer = await MerchantOfferModel.findOne({
      _id: id,
      merchantId: merchant._id
    });

    if (!offer) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Offer not found' });
      return;
    }

    Object.assign(offer, updateData);
    await offer.save();

    const populatedOffer = await MerchantOfferModel.findById(offer._id)
      .populate({
        path: 'variantId',
        populate: { path: 'masterId', select: 'title modelId brandId' }
      })
      .lean();

    res.status(StatusCodes.OK).json({ offer: populatedOffer });
  } catch (error) {
    console.error('Update merchant offer error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to update offer',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get available offers for checkout (public)
 * Finds all active offers for a variant, filters by country and stock
 */
export const getAvailableOffers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { variantId, country = 'NL', quantity = 1 } = req.query;

    if (!variantId) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: 'variantId required' });
      return;
    }

    // Find all active offers for this variant in the specified country
    const offers = await MerchantOfferModel.find({
      variantId,
      status: 'active',
      listingCountries: country
    })
      .populate('merchantId', 'name')
      .lean();

    // Get current prices and stock for each offer
    const now = new Date();
    const offersWithDetails = await Promise.all(
      offers.map(async (offer: any) => {
        const [currentPrice, stocks] = await Promise.all([
          MerchantPriceModel.findOne({
            offerId: offer._id,
            validFrom: { $lte: now },
            $or: [{ validTo: { $gte: now } }, { validTo: null }]
          }).sort({ validFrom: -1 }).lean(),
          MerchantStockModel.find({
            offerId: offer._id,
            status: 'in_stock',
            availableQty: { $gte: Number(quantity) }
          }).lean()
        ]);

        const totalStock = stocks.reduce((sum: number, stock: any) => sum + (stock.availableQty || 0), 0);

        return {
          ...offer,
          price: currentPrice,
          totalStock,
          hasStock: totalStock >= Number(quantity)
        };
      })
    );

    // Filter offers with stock and sort by effectivePrice
    const availableOffers = offersWithDetails
      .filter((offer: any) => offer.hasStock && offer.price)
      .sort((a: any, b: any) => (a.price.effectivePrice || 0) - (b.price.effectivePrice || 0));

    res.status(StatusCodes.OK).json({
      offers: availableOffers,
      count: availableOffers.length,
      lowestPrice: availableOffers[0]?.price?.effectivePrice || null
    });
  } catch (error) {
    console.error('Get available offers error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to fetch available offers',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

