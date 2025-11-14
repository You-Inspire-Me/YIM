import { Document, Model, Schema, Types, model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * MerchantOffer - Zalando-grade offer
 * Links merchant to variant, NO price/stock here
 */
export interface MerchantOffer {
  offerId: string; // UUID (unique)
  merchantId: Types.ObjectId; // Reference to Merchant
  variantId: Types.ObjectId; // Reference to ProductVariant
  merchantSku: string;
  status: 'active' | 'paused';
  listingCountries: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MerchantOfferDocument extends MerchantOffer, Document {}

interface MerchantOfferModel extends Model<MerchantOfferDocument> {
  build(attrs: MerchantOffer): MerchantOfferDocument;
}

const merchantOfferSchema = new Schema<MerchantOfferDocument, MerchantOfferModel>(
  {
    offerId: {
      type: String,
      required: true,
      unique: true,
      default: () => uuidv4(),
      index: true
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true
    },
    variantId: {
      type: Schema.Types.ObjectId,
      ref: 'ProductVariant',
      required: true,
      index: true
    },
    merchantSku: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['active', 'paused'],
      default: 'active',
      index: true
    },
    listingCountries: [{
      type: String,
      trim: true
    }]
  },
  {
    timestamps: true
  }
);

// Unique: one offer per merchant per variant
merchantOfferSchema.index({ merchantId: 1, variantId: 1 }, { unique: true });
merchantOfferSchema.index({ status: 1, listingCountries: 1 });

merchantOfferSchema.statics.build = (attrs: MerchantOffer): MerchantOfferDocument =>
  new MerchantOfferModel(attrs);

export const MerchantOfferModel = model<MerchantOfferDocument, MerchantOfferModel>(
  'MerchantOffer',
  merchantOfferSchema
);

