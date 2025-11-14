import { Document, Model, Schema, Types, model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * Location - Warehouse/store/3PL locations
 */
export interface Location {
  locationId: string; // UUID
  merchantId: Types.ObjectId; // Reference to Merchant
  type: 'store' | 'warehouse' | '3pl';
  name: string;
  address: string;
  timezone: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocationDocument extends Location, Document {}

interface LocationModel extends Model<LocationDocument> {
  build(attrs: Location): LocationDocument;
}

const locationSchema = new Schema<LocationDocument, LocationModel>(
  {
    locationId: {
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
    type: {
      type: String,
      enum: ['store', 'warehouse', '3pl'],
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      required: true,
      trim: true
    },
    timezone: {
      type: String,
      required: true,
      default: 'Europe/Amsterdam'
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

locationSchema.index({ merchantId: 1, active: 1 });

locationSchema.statics.build = (attrs: Location): LocationDocument => new LocationModel(attrs);

export const LocationModel = model<LocationDocument, LocationModel>('Location', locationSchema);

