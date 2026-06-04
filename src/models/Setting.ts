import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISetting extends Document {
  upiQrCode: string;
  upiId: string;
  contactEmail: string;
  contactPhone: string;
  heroBannerUrl: string;
  heroBannerType: string;
  createdAt: Date;
  updatedAt: Date;
}

const SettingSchema = new Schema<ISetting>(
  {
    upiQrCode: { type: String, default: "" },
    upiId: { type: String, default: "sujoodmate@upi" },
    contactEmail: { type: String, default: "support@sujoodmate.com" },
    contactPhone: { type: String, default: "+91 98765 43210" },
    heroBannerUrl: { type: String, default: "" },
    heroBannerType: { type: String, enum: ["image", "video"], default: "image" },
  },
  { timestamps: true }
);

SettingSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Setting: Model<ISetting> =
  mongoose.models.Setting || mongoose.model<ISetting>("Setting", SettingSchema);

export default Setting;
