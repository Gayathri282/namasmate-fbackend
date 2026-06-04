import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  salePrice: number;
  shippingCharge: number;
  images: string[];
  videos: string[];
  variants: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    salePrice: { type: Number, default: 0 },
    shippingCharge: { type: Number, default: 0 },
    images: { type: [String], default: [] },
    videos: { type: [String], default: [] },
    variants: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Format json representation to map _id to id
ProductSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
