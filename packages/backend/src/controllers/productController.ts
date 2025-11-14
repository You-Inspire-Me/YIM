import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { AuthRequest } from '../middleware/authMiddleware.js';
import { ProductModel } from '../models/Product.js';
import { VariantModel } from '../models/Variant.js';

/**
 * Get all global products (PIM)
 * Public endpoint - anyone can browse products
 * Hosts can see all products, others only see published products
 */
export const getProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, search, limit = 50, skip = 0 } = req.query;
    const isHost = req.user && req.user.role === 'creator';

    const filter: Record<string, unknown> = {};

    // Only show published products to non-hosts
    if (!isHost) {
      filter.published = true;
    }

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
 * Search for products
 * Supports:
 * - General search by title, SKU, EAN (for Look editor)
 * - Specific search by SKU/EAN (for product claiming)
 */
export const searchProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, sku, ean, limit = 50 } = req.query;
    const isHost = req.user && req.user.role === 'creator';

    // General search (for Look editor)
    if (search && typeof search === 'string') {
      const filter: Record<string, unknown> = {};
      
      // Only show published products to non-hosts
      if (!isHost) {
        filter.published = true;
      }

      // Search in title, SKU, or EAN
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { title: searchRegex },
        { sku: searchRegex },
        { ean: searchRegex }
      ];

      const products = await ProductModel.find(filter)
        .select('title sku images variants')
        .populate('variants', 'size color')
        .limit(Number(limit))
        .sort({ createdAt: -1 })
        .lean();

      // Transform to match frontend expectations
      const items = products.map((product) => ({
        _id: product._id.toString(),
        title: product.title,
        sku: product.sku,
        images: product.images || [],
        price: 0, // Price is in MerchantOffer, not Product
        inventory: 0, // Stock is in MerchantStock, not Product
        sizes: (product.variants as any[] || []).map((v: any) => v.size || '').filter(Boolean)
      }));

      res.status(StatusCodes.OK).json({ items });
      return;
    }

    // Specific search by SKU/EAN (for product claiming)
    if (sku || ean) {
      const filter: Record<string, unknown> = {};
      if (sku) filter.sku = sku;
      if (ean) filter.ean = ean;

      const product = await ProductModel.findOne(filter).populate('variants').lean();

      if (!product) {
        res.status(StatusCodes.NOT_FOUND).json({ message: 'Product not found' });
        return;
      }

      res.status(StatusCodes.OK).json({ product });
      return;
    }

    res.status(StatusCodes.BAD_REQUEST).json({ message: 'search, SKU, or EAN required' });
  } catch (error) {
    console.error('Search product error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to search product',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
