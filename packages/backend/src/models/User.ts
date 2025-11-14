import bcrypt from 'bcryptjs';
import { Document, Model, Schema, Types, model } from 'mongoose';

export type UserRole = 'customer' | 'creator';

export interface User {
  email: string;
  password: string;
  role: UserRole;
  profile: {
    name: string;
    address?: {
      street: string;
      city: string;
      zipCode: string;
      country: string;
    };
    sizes?: Array<{
      brand: string;
      size: string;
    }>;
  };
  likes?: Array<{
    type: 'Look' | 'Product' | 'Creator';
    id: Types.ObjectId;
  }>;
  orders?: Types.ObjectId[]; // References to Order documents
  returns?: Types.ObjectId[]; // References to Return documents
  avatarUrl?: string;
}

export interface UserDocument extends User, Document {
  comparePassword(candidate: string): Promise<boolean>;
}

interface UserModel extends Model<UserDocument> {
  build(attrs: User): UserDocument;
}

const userSchema = new Schema<UserDocument, UserModel>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['customer', 'creator'],
      default: 'customer',
      index: true
    },
    profile: {
      name: { type: String, required: true, trim: true },
      address: {
        street: { type: String, trim: true },
        city: { type: String, trim: true },
        zipCode: { type: String, trim: true },
        country: { type: String, trim: true, default: 'NL' }
      },
      sizes: [
        {
          brand: { type: String, trim: true },
          size: { type: String, trim: true }
        }
      ]
    },
    likes: [
      {
        type: { type: String, enum: ['Look', 'Product', 'Creator'], required: true },
        id: { type: Schema.Types.ObjectId, required: true, refPath: 'likes.type' }
      }
    ],
    orders: [{ type: Schema.Types.ObjectId, ref: 'Order' }],
    returns: [{ type: Schema.Types.ObjectId, ref: 'Return' }],
    avatarUrl: { type: String }
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        if (ret.password) delete (ret as any).password;
        return ret;
      }
    }
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

userSchema.statics.build = (attrs: User): UserDocument => new UserModel(attrs);

export const UserModel = model<UserDocument, UserModel>('User', userSchema);
