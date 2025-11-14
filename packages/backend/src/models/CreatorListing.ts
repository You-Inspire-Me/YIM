import { Document, Model, Schema, Types, model } from 'mongoose';

/**
 * CreatorListing - Vendor-specific listing
 * Each creator can have their own price, stock, and supplier info for a product variant
 */
export interface CreatorListing {
  creatorId: Types.ObjectId; // Reference to User (creator)
  productId: Types.ObjectId; // Reference to Product (global)
  variantId: Types.ObjectId; // Reference to Variant
  sku: string; // Creator-specific SKU (can differ from global)
  priceExclVat: number; // Creator's price excl. BTW
  priceInclVat: number; // Creator's price incl. BTW (calculated)
  vatRate: number; // VAT rate (0, 9, or 21, default 21)
  stock: number; // Available stock for this creator
  costPrice?: number; // Cost price for creator
  supplier?: string; // Supplier name
  active: boolean; // Whether listing is active
  posSystem: 'lightspeed' | 'vend' | 'shopify' | 'none'; // POS system integration
  posSync: boolean; // Whether to auto-sync with POS
  lastPosSync?: Date; // Last successful POS sync
  posExternalId?: string; // External ID in POS system (e.g. Lightspeed item ID)
  createdAt: Date;
}

export interface CreatorListingDocument extends CreatorListing, Document {}

interface CreatorListingModel extends Model<CreatorListingDocument> {
  build(attrs: CreatorListing): CreatorListingDocument;
}

const creatorListingSchema = new Schema<CreatorListingDocument, CreatorListingModel>(
  {
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    variantId: {
      type: Schema.Types.ObjectId,
      ref: 'Variant',
      required: true
    },
    sku: { type: String, required: true, trim: true },
    priceExclVat: { type: Number, required: true, min: 0 },
    priceInclVat: { type: Number, required: true, min: 0 },
    vatRate: { type: Number, enum: [0, 9, 21], default: 21, required: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
    costPrice: { type: Number, min: 0 },
    supplier: { type: String, trim: true },
    active: { type: Boolean, default: true, index: true },
    posSystem: {
      type: String,
      enum: ['lightspeed', 'vend', 'shopify', 'none'],
      default: 'none',
      index: true
    },
    posSync: { type: Boolean, default: false, index: true },
    lastPosSync: { type: Date },
    posExternalId: { type: String, trim: true }
  },
  {
    timestamps: true
  }
);

// Unique: one listing per creator per product variant
creatorListingSchema.index({ creatorId: 1, productId: 1, variantId: 1 }, { unique: true });

// Compound index for active listings with stock
creatorListingSchema.index({ active: 1, stock: 1 });
creatorListingSchema.index({ productId: 1, variantId: 1, active: 1, stock: 1 }); // For checkout queries
creatorListingSchema.index({ posSystem: 1, posExternalId: 1 }, { sparse: true }); // For POS sync

// Pre-save hook to calculate priceInclVat if not provided
creatorListingSchema.pre('save', function (next) {
  if (this.isModified('priceExclVat') || this.isModified('vatRate')) {
    // Auto-calculate priceInclVat from priceExclVat and vatRate
    this.priceInclVat = this.priceExclVat * (1 + (this.vatRate || 21) / 100);
  } else if (this.isModified('priceInclVat') && !this.isModified('priceExclVat')) {
    // If only priceInclVat is modified, calculate priceExclVat
    this.priceExclVat = this.priceInclVat / (1 + (this.vatRate || 21) / 100);
  }
  next();
});

creatorListingSchema.statics.build = (attrs: CreatorListing): CreatorListingDocument =>
  new CreatorListingModel(attrs);

export const CreatorListingModel = model<CreatorListingDocument, CreatorListingModel>(
  'CreatorListing',
  creatorListingSchema
);

