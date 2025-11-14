import { Document, Model, Schema, Types, model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * ProductVariant - Zalando-grade variant
 * Size/color/material combinations, NO price/stock
 */
export interface ProductVariant {
  variantId: string; // UUID (unique)
  masterId: Types.ObjectId; // Reference to ProductMaster
  sku: string;
  ean?: string;
  size: string;
  colorCode: string;
  material?: string;
  gender?: string;
  fit?: string;
  weight?: number; // grams
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  images: Types.ObjectId[]; // References to Media
  attributes: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariantDocument extends ProductVariant, Document {}

interface ProductVariantModel extends Model<ProductVariantDocument> {
  build(attrs: ProductVariant): ProductVariantDocument;
}

const productVariantSchema = new Schema<ProductVariantDocument, ProductVariantModel>(
  {
    variantId: {
      type: String,
      required: true,
      unique: true,
      default: () => uuidv4(),
      index: true
    },
    masterId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductMaster',
      required: true,
      index: true
    },
    sku: {
      type: String,
      required: true,
      trim: true
    },
    ean: {
      type: String,
      trim: true,
      index: true
    },
    size: {
      type: String,
      required: true,
      trim: true
    },
    colorCode: {
      type: String,
      required: true,
      trim: true
    },
    material: {
      type: String,
      trim: true
    },
    gender: {
      type: String,
      trim: true
    },
    fit: {
      type: String,
      trim: true
    },
    weight: {
      type: Number,
      min: 0
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    images: [{
      type: Schema.Types.ObjectId,
      ref: 'Media'
    }],
    attributes: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Unique compound index: one variant per master+size+color
productVariantSchema.index({ masterId: 1, size: 1, colorCode: 1 }, { unique: true });
productVariantSchema.index({ ean: 1 });

productVariantSchema.statics.build = (attrs: ProductVariant): ProductVariantDocument =>
  new ProductVariantModel(attrs);

export const ProductVariantModel = model<ProductVariantDocument, ProductVariantModel>(
  'ProductVariant',
  productVariantSchema
);

