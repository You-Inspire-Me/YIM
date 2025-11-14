import { Document, Model, Schema, Types, model } from 'mongoose';

/**
 * Merchant - Extends User with merchant-specific fields
 * This is a separate collection that references User
 */
export interface Merchant {
  merchantId: Types.ObjectId; // Reference to User (unique)
  name: string;
  legalEntity: string;
  country: string;
  onboardedAt: Date;
  active: boolean;
  posSystem?: 'lightspeed' | 'vend' | 'shopify' | 'none';
  posApiKey?: string;
  posStoreId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MerchantDocument extends Merchant, Document {}

interface MerchantModel extends Model<MerchantDocument> {
  build(attrs: Merchant): MerchantDocument;
}

const merchantSchema = new Schema<MerchantDocument, MerchantModel>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    legalEntity: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      required: true,
      default: 'NL',
      trim: true
    },
    onboardedAt: {
      type: Date,
      default: Date.now
    },
    active: {
      type: Boolean,
      default: true,
      index: true
    },
    posSystem: {
      type: String,
      enum: ['lightspeed', 'vend', 'shopify', 'none'],
      default: 'none'
    },
    posApiKey: {
      type: String,
      trim: true
    },
    posStoreId: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

merchantSchema.statics.build = (attrs: Merchant): MerchantDocument => new MerchantModel(attrs);

export const MerchantModel = model<MerchantDocument, MerchantModel>('Merchant', merchantSchema);

