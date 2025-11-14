import { Document, Model, Schema, Types, model } from 'mongoose';

/**
 * Global Product (PIM - Product Information Management)
 * Shared across all creators - no vendor-specific data
 */
export interface Product {
  sku: string; // Unique global SKU
  ean?: string; // European Article Number
  title: string;
  description: string;
  category: 'dames' | 'heren' | 'kinderen' | 'all';
  images: string[]; // Cloudinary URLs
  specs: {
    maat?: string;
    kleur?: string;
    materiaal?: string;
    [key: string]: string | undefined; // Flexible specs
  };
  variants: Types.ObjectId[]; // References to Variant documents
  createdAt: Date;
}

export interface ProductDocument extends Product, Document {}

interface ProductModel extends Model<ProductDocument> {
  build(attrs: Product): ProductDocument;
}

const productSchema = new Schema<ProductDocument, ProductModel>(
  {
    sku: { type: String, required: true, unique: true, trim: true, index: true },
    ean: { type: String, unique: true, sparse: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['dames', 'heren', 'kinderen', 'all'],
      required: true,
      index: true
    },
    images: { type: [String], default: [] },
    specs: {
      type: Schema.Types.Mixed,
      default: {}
    },
    variants: [{ type: Schema.Types.ObjectId, ref: 'Variant' }]
  },
  {
    timestamps: true
  }
);

// Indexes
productSchema.index({ category: 1, createdAt: -1 });
productSchema.index({ 'specs.maat': 1, 'specs.kleur': 1 }, { sparse: true });

productSchema.statics.build = (attrs: Product): ProductDocument => new ProductModel(attrs);

export const ProductModel = model<ProductDocument, ProductModel>('Product', productSchema);
