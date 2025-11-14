import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { AuthRequest } from '../middleware/authMiddleware.js';
import { ProductModel } from '../models/Product.js';
import { VariantModel } from '../models/Variant.js';

/**
 * Get all global products (PIM)
 * Public endpoint - anyone can browse products
 */
export const getProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, search, limit = 50, skip = 0 } = req.query;

    const filter: Record<string, unknown> = {};

    if (category && typeof category === 'string' && category !== 'all') {
      filter.category = category;
    }

    if (search && typeof search === 'string') {
      filter.$text = { $search: search };
    }

    const products = await ProductModel.find(filter)
      .populate('variants')
      .limit(Number(limit))
      .skip(Number(skip))
      .sort({ createdAt: -1 })
      .lean();

    const total = await ProductModel.countDocuments(filter);

    res.status(StatusCodes.OK).json({
      products,
      total,
      limit: Number(limit),
      skip: Number(skip)
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to fetch products',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get single product by ID
 */
export const getProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await ProductModel.findById(id).populate('variants').lean();

    if (!product) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Product not found' });
      return;
    }

    res.status(StatusCodes.OK).json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to fetch product',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Create global product (PIM)
 * Only creators can create products
 */
export const createProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const { sku, ean, title, description, category, images, specs, variants } = req.body;

    // Check if SKU already exists
    const existingProduct = await ProductModel.findOne({ sku });
    if (existingProduct) {
      res.status(StatusCodes.CONFLICT).json({ message: 'Product with this SKU already exists' });
      return;
    }

    // Create product (PIM only - no price/stock)
    const product = await ProductModel.create({
      sku,
      ean,
      title,
      description,
      category: category || 'all',
      images: images || [],
      specs: specs || {},
      variants: []
    });

    // Create variants if provided
    if (variants && Array.isArray(variants)) {
      const createdVariants = await Promise.all(
        variants.map((variant: { size: string; color: string; images?: string[]; weight: number; barcode?: string }) =>
          VariantModel.create({
            productId: product._id,
            size: variant.size,
            color: variant.color,
            images: variant.images || [],
            weight: variant.weight,
            barcode: variant.barcode
          })
        )
      );

      product.variants = createdVariants.map((v) => v._id) as any;
      await product.save();
    }

    const populatedProduct = await ProductModel.findById(product._id).populate('variants').lean();

    res.status(StatusCodes.CREATED).json({ product: populatedProduct });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to create product',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Update global product
 */
export const updateProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const { id } = req.params;
    const updateData = req.body;

    const product = await ProductModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    })
      .populate('variants')
      .lean();

    if (!product) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Product not found' });
      return;
    }

    res.status(StatusCodes.OK).json({ product });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to update product',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Search for existing product by SKU/EAN
 * Used when creator wants to "claim" an existing product
 */
export const searchProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sku, ean } = req.query;

    if (!sku && !ean) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: 'SKU or EAN required' });
      return;
    }

    const filter: Record<string, unknown> = {};
    if (sku) filter.sku = sku;
    if (ean) filter.ean = ean;

    const product = await ProductModel.findOne(filter).populate('variants').lean();

    if (!product) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Product not found' });
      return;
    }

    res.status(StatusCodes.OK).json({ product });
  } catch (error) {
    console.error('Search product error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to search product',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
