import { Document, Model, Schema, Types, model } from 'mongoose';

/**
 * Look - Creator's styled content/outfits
 * Links to global Products (not vendor-specific)
 */
export interface LookProduct {
  productId: Types.ObjectId; // Reference to global Product
  variantId: Types.ObjectId; // Reference to Variant
  positionX?: number; // Hotspot X coordinate (0-100)
  positionY?: number; // Hotspot Y coordinate (0-100)
}

export interface Look {
  creatorId: Types.ObjectId; // Reference to User (creator)
  title: string;
  description: string;
  images: string[]; // Cloudinary URLs, order matters
  products: LookProduct[];
  tags: string[];
  category: 'dames' | 'heren' | 'kinderen' | 'all';
  published: boolean;
  likes: number; // Count of likes
}

export interface LookDocument extends Look, Document {}

interface LookModel extends Model<LookDocument> {
  build(attrs: Look): LookDocument;
}

const lookProductSchema = new Schema<LookProduct>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'Variant', required: true },
    positionX: { type: Number, min: 0, max: 100 },
    positionY: { type: Number, min: 0, max: 100 }
  },
  { _id: false }
);

const lookSchema = new Schema<LookDocument, LookModel>(
  {
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    images: [{ type: String, required: true }],
    products: [lookProductSchema],
    tags: [{ type: String, trim: true }],
    category: {
      type: String,
      enum: ['dames', 'heren', 'kinderen', 'all'],
      default: 'all',
      index: true
    },
    published: { type: Boolean, default: false, index: true },
    likes: { type: Number, default: 0, min: 0 }
  },
  {
    timestamps: true
  }
);

// Indexes
lookSchema.index({ creatorId: 1, createdAt: -1 });
lookSchema.index({ published: 1, category: 1, createdAt: -1 });
lookSchema.index({ tags: 'text' }); // Text search on tags

lookSchema.statics.build = (attrs: Look): LookDocument => new LookModel(attrs);

export const LookModel = model<LookDocument, LookModel>('Look', lookSchema);
