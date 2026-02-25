import mongoose, { Schema, Document } from "mongoose";
import { CustomerStatus } from "./Customer.js";

export interface ICampaign extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  agentId: string;
  batchId: string | null;
  targetStatus: CustomerStatus;
  status: "draft" | "scheduled" | "running" | "completed" | "failed" | "stopped";
  leadCount: number;
  scheduledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const campaignSchema = new Schema<ICampaign>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    agentId: { type: String, required: true },
    batchId: { type: String, default: null },
    targetStatus: {
      type: String,
      enum: ["fresh", "interested", "not_interested", "booked", "NA"],
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "running", "completed", "failed", "stopped"],
      default: "draft",
    },
    leadCount: { type: Number, default: 0 },
    scheduledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Campaign = mongoose.model<ICampaign>("Campaign", campaignSchema);
