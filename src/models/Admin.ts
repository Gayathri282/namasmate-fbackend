import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAdmin extends Document {
  email: string;
  hashedPassword: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema = new Schema<IAdmin>(
  {
    email: { type: String, required: true, unique: true },
    hashedPassword: { type: String, required: true },
  },
  { timestamps: true }
);

AdminSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.hashedPassword; // safety check
    delete ret.__v;
    return ret;
  },
});

const Admin: Model<IAdmin> =
  mongoose.models.Admin || mongoose.model<IAdmin>("Admin", AdminSchema);

export default Admin;
