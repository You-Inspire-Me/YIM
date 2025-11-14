import { Document, Model, Schema, Types, model } from 'mongoose';

/**
 * Discount/Coupon - Promotional codes
 * Can be global or creator-specific
 */
export type DiscountType = 'percentage' | 'fixed' | 'free-shipping';

export interface Discount {
  code: string; // Unique coupon code
  type: DiscountType;
  value: number; // Percentage (0-100) or fixed amount in cents
  minAmount?: number; // Minimum order amount to apply
  maxUses?: number; // Maximum number of uses (null = unlimited)
  uses: number; // Current number of uses
  validFrom: Date;
  validTo: Date;
  creatorId?: Types.ObjectId; // Optional: creator-specific discount
  global: boolean; // If true, applies to all creators
  active: boolean; // Whether discount is currently active
}

export interface DiscountDocument extends Discount, Document {}

interface DiscountModel extends Model<DiscountDocument> {
  build(attrs: Discount): DiscountDocument;
}

const discountSchema = new Schema<DiscountDocument, DiscountModel>(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },
    type: {
      type: String,
      enum: ['percentage', 'fixed', 'free-shipping'],
      required: true
    },
    value: { type: Number, required: true, min: 0 },
    minAmount: { type: Number, min: 0 },
    maxUses: { type: Number, min: 0 },
    uses: { type: Number, default: 0, min: 0 },
    validFrom: { type: Date, required: true, index: true },
    validTo: { type: Date, required: true, index: true },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    global: { type: Boolean, default: false },
    active: { type: Boolean, default: true }
  },
  {
    timestamps: true
  }
);

// Compound index for validity period
discountSchema.index({ validFrom: 1, validTo: 1 });
discountSchema.index({ creatorId: 1, active: 1 });

discountSchema.statics.build = (attrs: Discount): DiscountDocument => new DiscountModel(attrs);

export const DiscountModel = model<DiscountDocument, DiscountModel>('Discount', discountSchema);

