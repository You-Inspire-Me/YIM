import { Document, Model, Schema, Types, model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * ProductMaster - Zalando-grade PIM
 * Centralized product information, NO price/stock
 */
export interface ProductMaster {
  masterId: string; // UUID (unique)
  modelId: string;
  title: string;
  descriptionHtml: string;
  brandId: string;
  vendorCode: string;
  categoryId: Types.ObjectId;
  status: 'draft' | 'published' | 'archived';
  canonicalImageId?: Types.ObjectId;
  metafields: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface ProductMasterDocument extends ProductMaster, Document {}

interface ProductMasterModel extends Model<ProductMasterDocument> {
  build(attrs: ProductMaster): ProductMasterDocument;
}

const productMasterSchema = new Schema<ProductMasterDocument, ProductMasterModel>(
  {
    masterId: {
      type: String,
      required: true,
      unique: true,
      default: () => uuidv4(),
      index: true
    },
    modelId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    descriptionHtml: {
      type: String,
      required: true
    },
    brandId: {
      type: String,
      required: true,
      trim: true
    },
    vendorCode: {
      type: String,
      required: true,
      trim: true
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true
    },
    canonicalImageId: {
      type: Schema.Types.ObjectId,
      ref: 'Media'
    },
    metafields: {
      type: Schema.Types.Mixed,
      default: {}
    },
    publishedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Indexes
productMasterSchema.index({ modelId: 1 });
productMasterSchema.index({ status: 1 });
productMasterSchema.index({ categoryId: 1 });

productMasterSchema.statics.build = (attrs: ProductMaster): ProductMasterDocument =>
  new ProductMasterModel(attrs);

export const ProductMasterModel = model<ProductMasterDocument, ProductMasterModel>(
  'ProductMaster',
  productMasterSchema
);

