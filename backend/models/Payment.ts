import mongoose, { Schema, Document } from "mongoose";
import { tenantPlugin } from "../plugins/tenantPlugin.js";

export interface IPayment extends Document {
  userId: mongoose.Types.ObjectId;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  amountPaid: number;       // paise
  status: "pending" | "success" | "failed";
  periodStart: Date | null;
  periodEnd: Date | null;   // periodStart + 30 days
  createdAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String, default: null },
    amountPaid: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null },
  },
  { timestamps: true }
);

// Query performance indexes
paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ userId: 1, createdAt: -1 });

// Apply tenant isolation plugin
paymentSchema.plugin(tenantPlugin);

export const Payment = mongoose.model<IPayment>("Payment", paymentSchema);
