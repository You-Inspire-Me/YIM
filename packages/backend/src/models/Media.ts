import { Document, Model, Schema, Types, model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * Media - Zalando-grade media storage
 */
export interface Media {
  imageId: string; // UUID
  url: string;
  type: string;
  altText?: string;
  copyrightHolder?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaDocument extends Media, Document {}

interface MediaModel extends Model<MediaDocument> {
  build(attrs: Media): MediaDocument;
}

const mediaSchema = new Schema<MediaDocument, MediaModel>(
  {
    imageId: {
      type: String,
      required: true,
      unique: true,
      default: () => uuidv4(),
      index: true
    },
    url: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true,
      enum: ['image', 'video', '360']
    },
    altText: {
      type: String,
      trim: true
    },
    copyrightHolder: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

mediaSchema.statics.build = (attrs: Media): MediaDocument => new MediaModel(attrs);

export const MediaModel = model<MediaDocument, MediaModel>('Media', mediaSchema);

