import { Document, Model, Schema, Types, model } from 'mongoose';

/**
 * Variant - Sub-document of Product
 * Represents size/color combinations of a global product
 */
export interface Variant {
  productId: Types.ObjectId; // Reference to Product
  size: string;
  color: string;
  images: string[]; // Variant-specific images (Cloudinary URLs)
  weight: number; // Weight in grams
  barcode?: string;
}

export interface VariantDocument extends Variant, Document {}

interface VariantModel extends Model<VariantDocument> {
  build(attrs: Variant): VariantDocument;
}

const variantSchema = new Schema<VariantDocument, VariantModel>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    size: { type: String, required: true, trim: true },
    color: { type: String, required: true, trim: true, index: true },
    images: { type: [String], default: [] },
    weight: { type: Number, required: true, min: 0 }, // Weight in grams
    barcode: { type: String, trim: true }
  },
  {
    timestamps: true
  }
);

// Unique compound index: one variant per product+size+color combination
variantSchema.index({ productId: 1, size: 1, color: 1 }, { unique: true });

variantSchema.statics.build = (attrs: Variant): VariantDocument => new VariantModel(attrs);

export const VariantModel = model<VariantDocument, VariantModel>('Variant', variantSchema);

