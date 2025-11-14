import { Document, Model, Schema, Types, model } from 'mongoose';

export type OrderStatus = 'draft' | 'pending' | 'paid' | 'shipped' | 'delivered';

export interface OrderItem {
  listingId: Types.ObjectId; // Reference to CreatorListing
  quantity: number;
  priceAtPurchase: number; // Price at time of purchase (snapshot)
}

export interface OrderTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
}

export interface HostSplit {
  creatorId: Types.ObjectId; // Reference to User (creator/host)
  items: OrderItem[];
  subtotal: number;
}

export interface Order {
  userId: Types.ObjectId; // Reference to User (customer)
  items: OrderItem[];
  totals: OrderTotals;
  status: OrderStatus;
  currency: string;
  tags: string[];
  notes?: string;
  market: string; // Market code (e.g., 'NL', 'BE')
  discountCode?: string; // Applied discount code
  hostSplit?: HostSplit[]; // Multi-vendor order split by host/creator
  createdAt: Date;
}

export interface OrderDocument extends Order, Document {}

interface OrderModel extends Model<OrderDocument> {
  build(attrs: Order): OrderDocument;
  generateOrderNumber(): Promise<string>;
}

const orderItemSchema = new Schema<OrderItem>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'CreatorListing', required: true },
    quantity: { type: Number, required: true, min: 1 },
    priceAtPurchase: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const orderTotalsSchema = new Schema<OrderTotals>(
  {
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    shipping: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const hostSplitSchema = new Schema<HostSplit>(
  {
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const orderSchema = new Schema<OrderDocument, OrderModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [orderItemSchema], required: true },
    totals: { type: orderTotalsSchema, required: true },
    status: {
      type: String,
      enum: ['draft', 'pending', 'paid', 'shipped', 'delivered'],
      default: 'pending',
      index: true
    },
    currency: { type: String, default: 'EUR', uppercase: true },
    tags: [{ type: String, trim: true }],
    notes: { type: String, trim: true },
    market: { type: String, default: 'NL', uppercase: true },
    discountCode: { type: String, trim: true, uppercase: true },
    hostSplit: { type: [hostSplitSchema], default: [] }
  },
  {
    timestamps: true
  }
);

// Compound index for status and date queries
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ userId: 1, createdAt: -1 });

orderSchema.statics.generateOrderNumber = async function (): Promise<string> {
  const count = await this.countDocuments();
  const timestamp = Date.now().toString().slice(-6);
  return `ORD-${timestamp}-${String(count + 1).padStart(4, '0')}`;
};

orderSchema.statics.build = (attrs: Order): OrderDocument => new OrderModel(attrs);

export const OrderModel = model<OrderDocument, OrderModel>('Order', orderSchema);
