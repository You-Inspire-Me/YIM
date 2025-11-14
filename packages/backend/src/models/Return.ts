import { Document, Model, Schema, Types, model } from 'mongoose';

/**
 * Return - Product return/refund requests
 */
export type ReturnStatus = 'requested' | 'approved' | 'shipped' | 'refunded';

export interface ReturnItem {
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  quantity: number;
  reason: string;
}

export interface Return {
  orderId: Types.ObjectId; // Reference to Order
  userId: Types.ObjectId; // Reference to User (customer)
  items: ReturnItem[];
  status: ReturnStatus;
  reason: string; // Overall return reason
  refundAmount: number; // Amount to refund
  notes?: string; // Admin notes
}

export interface ReturnDocument extends Return, Document {}

interface ReturnModel extends Model<ReturnDocument> {
  build(attrs: Return): ReturnDocument;
}

const returnItemSchema = new Schema<ReturnItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'Variant', required: true },
    quantity: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const returnSchema = new Schema<ReturnDocument, ReturnModel>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
      index: true
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [returnItemSchema], required: true },
    status: {
      type: String,
      enum: ['requested', 'approved', 'shipped', 'refunded'],
      default: 'requested',
      index: true
    },
    reason: { type: String, required: true, trim: true },
    refundAmount: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true }
  },
  {
    timestamps: true
  }
);

returnSchema.statics.build = (attrs: Return): ReturnDocument => new ReturnModel(attrs);

export const ReturnModel = model<ReturnDocument, ReturnModel>('Return', returnSchema);

