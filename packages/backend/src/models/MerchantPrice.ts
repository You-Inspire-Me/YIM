import { Document, Model, Schema, Types, model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * MerchantPrice - Zalando-grade pricing
 * Separate from stock, supports campaigns/sales
 */
export interface MerchantPrice {
  priceId: string; // UUID
  offerId: Types.ObjectId; // Reference to MerchantOffer
  currency: string; // Default: 'EUR'
  basePrice: number; // excl. VAT
  rrp?: number; // Recommended Retail Price
  salePrice?: number; // nullable
  effectivePrice: number; // computed: salePrice || basePrice
  validFrom: Date;
  validTo?: Date;
  source: 'merchant' | 'platform' | 'campaign';
  createdAt: Date;
  updatedAt: Date;
}

export interface MerchantPriceDocument extends MerchantPrice, Document {}

interface MerchantPriceModel extends Model<MerchantPriceDocument> {
  build(attrs: MerchantPrice): MerchantPriceDocument;
}

const merchantPriceSchema = new Schema<MerchantPriceDocument, MerchantPriceModel>(
  {
    priceId: {
      type: String,
      required: true,
      unique: true,
      default: () => uuidv4(),
      index: true
    },
    offerId: {
      type: Schema.Types.ObjectId,
      ref: 'MerchantOffer',
      required: true,
      index: true
    },
    currency: {
      type: String,
      required: true,
      default: 'EUR',
      trim: true
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0
    },
    rrp: {
      type: Number,
      min: 0
    },
    salePrice: {
      type: Number,
      min: 0
    },
    effectivePrice: {
      type: Number,
      required: true,
      min: 0
    },
    validFrom: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    validTo: {
      type: Date
    },
    source: {
      type: String,
      enum: ['merchant', 'platform', 'campaign'],
      default: 'merchant'
    }
  },
  {
    timestamps: true
  }
);

// Indexes
merchantPriceSchema.index({ offerId: 1, validFrom: 1 });
merchantPriceSchema.index({ validFrom: 1, validTo: 1 });

// Pre-save hook to calculate effectivePrice
merchantPriceSchema.pre('save', function (next) {
  if (this.isModified('salePrice') || this.isModified('basePrice')) {
    this.effectivePrice = this.salePrice || this.basePrice;
  }
  next();
});

merchantPriceSchema.statics.build = (attrs: MerchantPrice): MerchantPriceDocument =>
  new MerchantPriceModel(attrs);

export const MerchantPriceModel = model<MerchantPriceDocument, MerchantPriceModel>(
  'MerchantPrice',
  merchantPriceSchema
);

