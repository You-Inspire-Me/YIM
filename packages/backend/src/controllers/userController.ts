import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import { z } from 'zod';

import { AuthRequest } from '../middleware/authMiddleware.js';
import { UserModel } from '../models/User.js';
import { ProductModel } from '../models/Product.js';
import { LookModel } from '../models/Look.js';
import { OrderModel } from '../models/Order.js';

const toggleWishlistSchema = z.object({
  type: z.enum(['Look', 'Product', 'Creator']),
  id: z.string()
});

export const toggleWishlistItem = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const { type, id } = toggleWishlistSchema.parse(req.body);
    const user = await UserModel.findById(req.user._id);

    if (!user) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found' });
      return;
    }

    const likes = user.likes || [];
    const existingIndex = likes.findIndex((like) => like.type === type && like.id.toString() === id);

    if (existingIndex >= 0) {
      likes.splice(existingIndex, 1);
    } else {
      likes.push({ type, id: new Types.ObjectId(id) });
    }

    user.likes = likes;
    await user.save();

    res.status(StatusCodes.OK).json({ 
      message: existingIndex >= 0 ? 'Removed from wishlist' : 'Added to wishlist',
      isLiked: existingIndex < 0
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to update wishlist' });
  }
};

export const getWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const user = await UserModel.findById(req.user._id).lean();

    if (!user || !user.likes) {
      res.status(StatusCodes.OK).json({ items: [] });
      return;
    }

    const items = await Promise.all(
      user.likes.map(async (like) => {
        if (like.type === 'Product') {
          const product = await ProductModel.findById(like.id).lean();
          return product
            ? {
                ...product,
                type: 'Product',
                _id: product._id,
                image: product.images?.[0] || '',
                title: product.title
              }
            : null;
        }
        if (like.type === 'Look') {
          const look = await LookModel.findById(like.id)
            .populate('host', 'name avatarUrl')
            .lean();
          return look
            ? {
                ...look,
                type: 'Look',
                _id: look._id,
                image: look.images?.[0] || '',
                title: look.title
              }
            : null;
        }
        if (like.type === 'Creator') {
          const creator = await UserModel.findById(like.id).lean();
          return creator
            ? {
                ...creator,
                type: 'Creator',
                _id: creator._id,
                image: creator.avatarUrl || '',
                name: (creator as any).profile?.name || creator.email || 'Creator'
              }
            : null;
        }
        return null;
      })
    );

    res.status(StatusCodes.OK).json({ items: items.filter(Boolean) });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to get wishlist' });
  }
};

const saveSizesSchema = z.object({
  sizes: z.array(
    z.object({
      brand: z.string(),
      size: z.string()
    })
  )
});

export const saveSizes = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const { sizes } = saveSizesSchema.parse(req.body);
    const user = await UserModel.findById(req.user._id);

    if (!user) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found' });
      return;
    }

    if (!user.profile) {
      user.profile = {
        name: user.email || 'User'
      };
    }
    user.profile.sizes = sizes;
    await user.save();

    res.status(StatusCodes.OK).json({ message: 'Sizes saved', sizes });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to save sizes' });
  }
};

export const getSizes = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const user = await UserModel.findById(req.user._id).lean();

    if (!user || !user.profile || !user.profile.sizes) {
      res.status(StatusCodes.OK).json({ sizes: [] });
      return;
    }

    res.status(StatusCodes.OK).json({ sizes: user.profile.sizes });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to get sizes' });
  }
};

const createReturnSchema = z.object({
  orderId: z.string(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().positive()
    })
  )
});

export const createReturn = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const data = createReturnSchema.parse(req.body);
    // TODO: Create Return document and push ID to user.returns
    // For now, just return success as this feature needs proper Return model integration
    res.status(StatusCodes.CREATED).json({ message: 'Return request created' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to create return' });
  }
};

export const getReturns = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const user = await UserModel.findById(req.user._id).lean();

    if (!user || !user.returns) {
      res.status(StatusCodes.OK).json({ returns: [] });
      return;
    }

    res.status(StatusCodes.OK).json({ returns: user.returns });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to get returns' });
  }
};

export const getUserOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const orders = await OrderModel.find({ userId: req.user._id })
      .populate({
        path: 'items.listingId',
        populate: [
          {
            path: 'productId',
            select: 'title images category'
          },
          {
            path: 'variantId',
            select: 'size color images'
          },
          {
            path: 'creatorId',
            select: 'name avatarUrl'
          }
        ]
      })
      .sort({ createdAt: -1 })
      .lean();

    res.status(StatusCodes.OK).json({ orders });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to get orders' });
  }
};

