import { Document, Model, Schema, Types, model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * MerchantStock - Zalando-grade stock management
 * Separate from price, supports multiple locations
 */
export interface MerchantStock {
  stockId: string; // UUID
  offerId: Types.ObjectId; // Reference to MerchantOffer
  locationId: Types.ObjectId; // Reference to Location
  availableQty: number;
  incomingQty: number;
  reservedQty: number;
  status: 'in_stock' | 'backorder' | 'out_of_stock';
  lastSyncAt?: Date;
  posSystem?: 'lightspeed' | 'vend' | 'shopify' | 'none';
  posExternalId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MerchantStockDocument extends MerchantStock, Document {}

interface MerchantStockModel extends Model<MerchantStockDocument> {
  build(attrs: MerchantStock): MerchantStockDocument;
}

const merchantStockSchema = new Schema<MerchantStockDocument, MerchantStockModel>(
  {
    stockId: {
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
    locationId: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
      required: true
    },
    availableQty: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    incomingQty: {
      type: Number,
      default: 0,
      min: 0
    },
    reservedQty: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ['in_stock', 'backorder', 'out_of_stock'],
      default: 'out_of_stock',
      index: true
    },
    lastSyncAt: {
      type: Date
    },
    posSystem: {
      type: String,
      enum: ['lightspeed', 'vend', 'shopify', 'none'],
      default: 'none'
    },
    posExternalId: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
merchantStockSchema.index({ offerId: 1 });
merchantStockSchema.index({ status: 1, availableQty: 1 });
merchantStockSchema.index({ posSystem: 1, posExternalId: 1 }, { sparse: true });

// Pre-save hook to update status based on availableQty
merchantStockSchema.pre('save', function (next) {
  if (this.isModified('availableQty')) {
    if (this.availableQty > 0) {
      this.status = 'in_stock';
    } else if (this.incomingQty > 0) {
      this.status = 'backorder';
    } else {
      this.status = 'out_of_stock';
    }
  }
  next();
});

merchantStockSchema.statics.build = (attrs: MerchantStock): MerchantStockDocument =>
  new MerchantStockModel(attrs);

export const MerchantStockModel = model<MerchantStockDocument, MerchantStockModel>(
  'MerchantStock',
  merchantStockSchema
);

