// Legacy checkout - kept for backwards compatibility
// New checkout is in checkoutController.ts
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import Stripe from 'stripe';

import { env } from '../config/env.js';
import { ProductModel } from '../models/Product.js';
import { checkoutSchema } from '../validators/paymentSchema.js';

const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;
export const createCheckoutSession = async (req: Request, res: Response): Promise<void> => {
  if (!stripe) {
    res.status(StatusCodes.SERVICE_UNAVAILABLE).json({ message: 'Stripe is not configured' });
    return;
  }

  const { items } = checkoutSchema.parse(req.body);

  const products = await ProductModel.find({
    _id: { $in: items.map((item) => item.productId) }
  }).lean();

  const lineItems = items.map((item) => {
    const product = products.find((p) => p._id.toString() === item.productId);
    if (!product) {
      throw Object.assign(new Error('Product not found'), { status: StatusCodes.BAD_REQUEST });
    }

    return {
      price_data: {
        currency: 'eur',
        product_data: {
          name: product.title,
          description: product.description,
          images: product.images
        },
        unit_amount: Math.round(((product as any).basePrice || (product as any).price || 0) * 100)
      },
      quantity: item.quantity
    };
  });

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: lineItems,
    success_url: `${env.CLIENT_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.CLIENT_URL}/checkout/cancel`
  });

  res.status(StatusCodes.OK).json({ id: session.id, url: session.url });
};
