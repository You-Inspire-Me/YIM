import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import { AuthRequest } from '../middleware/authMiddleware.js';
import { LookModel } from '../models/Look.js';
import { ProductModel } from '../models/Product.js';

// Accept both HTTP URLs and base64 data URLs, or empty string (optional)
const urlOrDataUrl = z.string().refine(
  (val) => {
    // Allow empty string (optional image)
    if (!val || val === '') {
      return true;
    }
    try {
      // Try to validate as URL (HTTP/HTTPS)
      if (val.startsWith('http://') || val.startsWith('https://')) {
        z.string().url().parse(val);
        return true;
      }
      // Accept base64 data URLs
      if (val.startsWith('data:image/')) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
  { message: 'Must be a valid URL or base64 data URL' }
);

const createLookSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  images: z.array(urlOrDataUrl).min(1),
  products: z.array(
    z.object({
      productId: z.string(),
      variantId: z.string().optional(),
      sku: z.string(),
      title: z.string(),
      price: z.number().positive(),
      image: urlOrDataUrl.optional().default('https://via.placeholder.com/400x600?text=No+Image'),
      positionX: z.number().min(0).max(100).optional(),
      positionY: z.number().min(0).max(100).optional()
    })
  ),
  tags: z.array(z.string()).default([]),
  published: z.boolean().default(false),
  category: z.enum(['dames', 'heren', 'kinderen', 'all']).default('all')
});

export const createLook = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const data = createLookSchema.parse(req.body);
    
    // Ensure all products have a valid image URL
    const processedData = {
      ...data,
      products: data.products.map((product) => ({
        ...product,
        image: product.image || 'https://via.placeholder.com/400x600?text=No+Image'
      })),
      creatorId: req.user._id
    };
    
    const look = await LookModel.create(processedData);

    res.status(StatusCodes.CREATED).json({ look });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      res.status(StatusCodes.BAD_REQUEST).json({ 
        message: 'Validation error', 
        errors: error.errors 
      });
      return;
    }
    console.error('Create look error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: 'Failed to create look',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateLook = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const { id } = req.params;
    const data = createLookSchema.partial().parse(req.body);
    
    // Ensure all products have a valid image URL if products are being updated
    const processedData = data.products
      ? {
          ...data,
          products: data.products.map((product) => ({
            ...product,
            image: product.image || 'https://via.placeholder.com/400x600?text=No+Image'
          }))
        }
      : data;
    
    const look = await LookModel.findOneAndUpdate(
      { _id: id, creatorId: req.user._id },
      processedData,
      { new: true, runValidators: true }
    );

    if (!look) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Look not found' });
      return;
    }

    res.status(StatusCodes.OK).json({ look });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      res.status(StatusCodes.BAD_REQUEST).json({ 
        message: 'Validation error', 
        errors: error.errors 
      });
      return;
    }
    console.error('Update look error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: 'Failed to update look',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Public endpoint to get published looks
export const getPublicLooks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.query;
    const filters: Record<string, unknown> = { published: true };

    if (category && category !== 'all' && ['dames', 'heren', 'kinderen'].includes(category as string)) {
      filters.category = category;
    }

    const looks = await LookModel.find(filters)
      .populate('creatorId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Calculate likesCount from likes array length and convert likes to string array
    const looksWithCount = looks.map((look: any) => ({
      ...look,
      likes: look.likes?.map((id: any) => id.toString()) || [],
      likesCount: look.likes?.length || 0
    }));

    res.status(StatusCodes.OK).json({ looks: looksWithCount });
  } catch (error) {
    console.error('Get public looks error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: 'Failed to get looks',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getHostLooks = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  const { published } = req.query;
  const filters: Record<string, unknown> = { creatorId: req.user._id };

  if (published !== undefined) {
    filters.published = published === 'true';
  }

  const looks = await LookModel.find(filters)
    .populate('creatorId', 'name avatar')
    .sort({ createdAt: -1 })
    .lean();

  // Calculate likesCount from likes array length
  const looksWithCount = looks.map((look: any) => ({
    ...look,
    likesCount: look.likes?.length || 0
  }));

  res.status(StatusCodes.OK).json({ looks: looksWithCount });
};

export const getLook = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const { id } = req.params;
    const look = await LookModel.findOne({ _id: id, creatorId: req.user._id })
      .populate('creatorId', 'name avatar')
      .lean();

    if (!look) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Look not found' });
      return;
    }

    res.status(StatusCodes.OK).json({ look });
  } catch (error) {
    console.error('Get look error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to get look' });
  }
};

export const deleteLook = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const { id } = req.params;
    const look = await LookModel.findOneAndDelete({ _id: id, creatorId: req.user._id });

    if (!look) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Look not found' });
      return;
    }

    res.status(StatusCodes.OK).json({ message: 'Look deleted' });
  } catch (error) {
    console.error('Delete look error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to delete look' });
  }
};

export const togglePublished = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const { id } = req.params;
    const look = await LookModel.findOne({ _id: id, creatorId: req.user._id });

    if (!look) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Look not found' });
      return;
    }

    look.published = !look.published;
    await look.save();

    res.status(StatusCodes.OK).json({ look });
  } catch (error) {
    console.error('Toggle published error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to toggle published' });
  }
};

export const getPublicLook = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const look = await LookModel.findOne({ _id: id, published: true })
      .populate('creatorId', 'name avatar email')
      .lean();

    if (!look) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Look not found' });
      return;
    }

    // Populate products with full product details
    const { ProductModel } = await import('../models/Product.js');
    const populatedProducts = await Promise.all(
      look.products.map(async (product: any) => {
        const fullProduct = await ProductModel.findById(product.productId).lean();
        if (!fullProduct) return null;

        // Flatten the product data to match frontend expectations
        return {
          productId: product.productId,
          variantId: product.variantId,
          positionX: product.positionX,
          positionY: product.positionY,
          _id: product.productId, // Add for compatibility
          title: fullProduct.title,
          brand: (fullProduct as any).brand || '',
          description: fullProduct.description,
          images: fullProduct.images || [],
          price: (fullProduct as any).price,
          originalPrice: (fullProduct as any).originalPrice,
          discount: (fullProduct as any).discount,
          sizes: (fullProduct as any).sizes || [],
          colors: (fullProduct as any).colors || [],
          inventory: (fullProduct as any).inventory || 0,
          sku: fullProduct.sku,
          image: fullProduct.images?.[0] || 'https://via.placeholder.com/200' // Main image for display
        };
      })
    );

    const lookWithProducts = {
      ...look,
      products: populatedProducts.filter(Boolean)
    };

    const lookWithProductsAndCount = {
      ...lookWithProducts,
      likes: look.likes?.map((id: any) => id.toString()) || [],
      likesCount: look.likes?.length || 0
    };

    res.status(StatusCodes.OK).json({ look: lookWithProductsAndCount });
  } catch (error) {
    console.error('Get public look error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to get look' });
  }
};

// Like/Unlike a look
export const likeLook = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const { id } = req.params;
    const userId = req.user._id as any;

    const look = await LookModel.findById(id);

    if (!look) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Look not found' });
      return;
    }

    // Check if user already liked
    const likedIndex = look.likes.findIndex(
      (likeId: any) => likeId.toString() === userId.toString()
    );

    if (likedIndex >= 0) {
      // Unlike: remove from array
      look.likes.splice(likedIndex, 1);
    } else {
      // Like: add to array
      look.likes.push(userId as any);
    }

    // Update likesCount
    look.likesCount = look.likes.length;
    await look.save();

    res.status(StatusCodes.OK).json({
      liked: likedIndex < 0,
      likesCount: look.likesCount
    });
  } catch (error) {
    console.error('Like look error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to like look',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
