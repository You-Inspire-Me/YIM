import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { AuthRequest } from '../middleware/authMiddleware.js';
import { ProductMasterModel } from '../models/ProductMaster.js';
import { ProductVariantModel } from '../models/ProductVariant.js';
import { MediaModel } from '../models/Media.js';

/**
 * Get all product masters (PIM)
 */
export const getProductMasters = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, categoryId, search } = req.query;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (categoryId) filter.categoryId = categoryId;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { modelId: { $regex: search, $options: 'i' } },
        { brandId: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await ProductMasterModel.find(filter)
      .populate('canonicalImageId')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Get variant count for each product
    const productsWithVariants = await Promise.all(
      products.map(async (product: any) => {
        const variantCount = await ProductVariantModel.countDocuments({ masterId: product._id });
        return {
          ...product,
          variantCount
        };
      })
    );

    res.status(StatusCodes.OK).json({ products: productsWithVariants });
  } catch (error) {
    console.error('Get product masters error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to fetch products',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get product master by ID
 */
export const getProductMasterById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await ProductMasterModel.findById(id)
      .populate('canonicalImageId')
      .lean();

    if (!product) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Product not found' });
      return;
    }

    // Get all variants
    const variants = await ProductVariantModel.find({ masterId: product._id })
      .populate('images')
      .lean();

    res.status(StatusCodes.OK).json({
      product: {
        ...product,
        variants
      }
    });
  } catch (error) {
    console.error('Get product master error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to fetch product',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Create product master
 */
export const createProductMaster = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const { modelId, title, descriptionHtml, brandId, vendorCode, categoryId, variants, images } = req.body;

    // Check if modelId already exists
    const existing = await ProductMasterModel.findOne({ modelId });
    if (existing) {
      res.status(StatusCodes.CONFLICT).json({ message: 'Product with this modelId already exists' });
      return;
    }

    // Create media entries for images
    let imageIds: any[] = [];
    if (images && Array.isArray(images)) {
      imageIds = await Promise.all(
        images.map(async (url: string) => {
          const media = await MediaModel.create({
            url,
            type: 'image',
            altText: title
          });
          return media._id;
        })
      );
    }

    // Create product master
    const product = await ProductMasterModel.create({
      modelId,
      title,
      descriptionHtml,
      brandId,
      vendorCode,
      categoryId: categoryId || new (await import('mongoose')).Types.ObjectId(), // Default category
      status: 'draft',
      canonicalImageId: imageIds[0],
      metafields: {}
    });

    // Create variants if provided
    if (variants && Array.isArray(variants)) {
      const createdVariants = await Promise.all(
        variants.map(async (variant: {
          sku: string;
          ean?: string;
          size: string;
          colorCode: string;
          material?: string;
          weight?: number;
        }) => {
          return ProductVariantModel.create({
            masterId: product._id,
            sku: variant.sku,
            ean: variant.ean,
            size: variant.size,
            colorCode: variant.colorCode,
            material: variant.material,
            weight: variant.weight,
            images: imageIds,
            attributes: {}
          });
        })
      );

      // Update product with variant count
      await product.save();
    }

    const populatedProduct = await ProductMasterModel.findById(product._id)
      .populate('canonicalImageId')
      .lean();

    res.status(StatusCodes.CREATED).json({ product: populatedProduct });
  } catch (error) {
    console.error('Create product master error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to create product',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Update product master
 */
export const updateProductMaster = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Not authenticated' });
    return;
  }

  try {
    const { id } = req.params;
    const updateData = req.body;

    const product = await ProductMasterModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    })
      .populate('canonicalImageId')
      .lean();

    if (!product) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Product not found' });
      return;
    }

    res.status(StatusCodes.OK).json({ product });
  } catch (error) {
    console.error('Update product master error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Failed to update product',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

