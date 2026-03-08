import { Schema, model, Document } from "mongoose";

export interface ICoupon extends Document {
  code: string;               // Unique coupon code (from env)
  trialDays: number;          // Number of days to extend trial
  isActive: boolean;          // Whether coupon is currently valid
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true, // Normalize to uppercase
      trim: true,
    },
    trialDays: {
      type: Number,
      required: true,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Coupon = model<ICoupon>("Coupon", couponSchema);
