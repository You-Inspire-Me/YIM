import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import Stripe from 'stripe';
import { z } from 'zod';

import { env } from '../config/env.js';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { CreatorListingModel } from '../models/CreatorListing.js';
import { DiscountModel } from '../models/Discount.js';
import { OrderModel } from '../models/Order.js';
import { ProductModel } from '../models/Product.js';

const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;

const checkoutItemSchema = z.object({
  productId: z.string(),
  variantId: z.string(),
  quantity: z.number().int().min(1)
});

const checkoutSchema = z.object({
  items: z.array(checkoutItemSchema).min(1),
  discountCode: z.string().optional(),
  shippingAddress: z
    .object({
      street: z.string(),
      city: z.string(),
      zipCode: z.string(),
      country: z.string().default('NL')
    })
    .optional()
});

/**
 * Create checkout session with multi-vendor support
 * Finds best available listings for each product variant
 */
export const createCheckoutSession = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  if (!stripe) {
    res.status(StatusCodes.SERVICE_UNAVAILABLE).json({ message: 'Stripe is not configured' });
    return;
  }

  try {
    const { items, discountCode, shippingAddress } = checkoutSchema.parse(req.body);

    // Find best available listings for each item and group by host/creator
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const selectedListings: Array<{ listingId: string; quantity: number; price: number; creatorId: string }> = [];
    const hostGroups: Map<string, Array<{ listingId: string; quantity: number; price: number }>> = new Map();

    for (const item of items) {
      // Find available listings for this product variant
      const listings = await CreatorListingModel.find({
        productId: item.productId,
        variantId: item.variantId,
        active: true,
        stock: { $gte: item.quantity }
      })
        .populate('productId')
        .populate('variantId')
        .populate('creatorId', 'profile.name')
        .sort({ priceInclVat: 1 }) // Sort by price ascending (lowest first)
        .limit(1)
        .lean();

      if (listings.length === 0) {
        res.status(StatusCodes.BAD_REQUEST).json({
          message: `No available listing found for product ${item.productId} variant ${item.variantId} with sufficient stock`
        });
        return;
      }

      const listing = listings[0] as any;
      const product = listing.productId;
      const variant = listing.variantId;
      const creatorId = listing.creatorId._id.toString();

      // Add to Stripe line items (all items in one session)
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: `${product.title} - ${variant.size} / ${variant.color}`,
            description: product.description,
            images: product.images || []
          },
          unit_amount: Math.round(listing.priceInclVat * 100) // Convert to cents
        },
        quantity: item.quantity
      });

      const listingData = {
        listingId: listing._id.toString(),
        quantity: item.quantity,
        price: listing.priceInclVat
      };

      selectedListings.push({
        ...listingData,
        creatorId
      });

      // Group by host/creator
      if (!hostGroups.has(creatorId)) {
        hostGroups.set(creatorId, []);
      }
      hostGroups.get(creatorId)!.push(listingData);
    }

    // Calculate totals
    let subtotal = selectedListings.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let discount = 0;
    let discountObj = null;

    // Apply discount if provided
    if (discountCode) {
      discountObj = await DiscountModel.findOne({
        code: discountCode.toUpperCase(),
        active: true,
        validFrom: { $lte: new Date() },
        validTo: { $gte: new Date() },
        $or: [{ global: true }, { creatorId: req.user._id }]
      });

      if (discountObj) {
        // Check max uses
        if (discountObj.maxUses && discountObj.uses >= discountObj.maxUses) {
          res.status(StatusCodes.BAD_REQUEST).json({ message: 'Discount code has reached maximum uses' });
          return;
        }

        // Check min amount
        if (discountObj.minAmount && subtotal < discountObj.minAmount) {
          res.status(StatusCodes.BAD_REQUEST).json({
            message: `Minimum order amount of €${discountObj.minAmount} required for this discount`
          });
          return;
        }

        // Calculate discount
        if (discountObj.type === 'percentage') {
          discount = subtotal * (discountObj.value / 100);
        } else if (discountObj.type === 'fixed') {
          discount = discountObj.value / 100; // Convert cents to euros
        } else if (discountObj.type === 'free-shipping') {
          // Shipping discount handled separately
        }
      }
    }

    const shipping = 0; // TODO: Calculate shipping based on address/weight
    const total = subtotal - discount + shipping;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: `${env.CLIENT_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.CLIENT_URL}/checkout/cancel`,
      metadata: {
        userId: (req.user._id as any).toString(),
        listings: JSON.stringify(selectedListings),
        discountCode: discountCode || '',
        totals: JSON.stringify({ subtotal, discount, shipping, total })
      }
    });

    // Create draft order with host split (will be updated to 'paid' after webhook)
    const order = await OrderModel.create({
      userId: req.user._id as any,
      items: selectedListings.map((item) => ({
        listingId: item.listingId,
        quantity: item.quantity,
        priceAtPurchase: item.price
      })),
      totals: {
        subtotal,
        discount,
        shipping,
        total
      },
      status: 'draft',
      currency: 'EUR',
      tags: [],
      market: shippingAddress?.country || 'NL',
      discountCode: discountCode?.toUpperCase(),
      // Store host split for multi-vendor orders
      hostSplit: Array.from(hostGroups.entries()).map(([creatorId, items]) => ({
        creatorId: creatorId as any,
        items: items.map((item) => ({
          listingId: item.listingId as any,
          quantity: item.quantity,
          priceAtPurchase: item.price
        })),
        subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      }))
    });

    res.status(StatusCodes.OK).json({
      id: session.id,
      url: session.url,
      orderId: (order._id as any).toString()
    });
  } catch (error) {
    console.error('Create checkout session error:', error);
    if (error instanceof z.ZodError) {
      res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Validation error',
        errors: error.errors
      });
      return;
    }
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to create checkout session',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get available listings for checkout
 * Returns all available listings for a product variant with creator info
 */
export const getCheckoutListings = async (req: AuthRequest, res: Response): Promise<void> => {
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
      .populate('creatorId', 'profile.name avatarUrl')
      .sort({ priceInclVat: 1 })
      .lean();

    res.status(StatusCodes.OK).json({
      listings: listings.map((listing: any) => ({
        listingId: listing._id,
        creator: {
          id: listing.creatorId._id,
          name: listing.creatorId.profile?.name,
          avatarUrl: listing.creatorId.avatarUrl
        },
        priceExclVat: listing.priceExclVat,
        priceInclVat: listing.priceInclVat,
        stock: listing.stock,
        sku: listing.sku
      }))
    });
  } catch (error) {
    console.error('Get checkout listings error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to fetch listings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

