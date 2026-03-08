import mongoose, { Schema, Document, Query } from "mongoose";
import { tenantPlugin } from "../plugins/tenantPlugin.js";

export type CustomerStatus = "fresh" | "interested" | "not_interested" | "booked" | "NA" | "queries";

export interface IPastConversation {
  date: Date;
  summary: string;
  summary_en?: string;
  summary_hi?: string;
  next_step?: string;
  sentiment?: string;
  notes: string;
}

export interface ICustomer extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  phoneNumber: string;   // E.164 format: +91XXXXXXXXXX
  email: string;
  status: CustomerStatus;
  pastConversations: IPastConversation[];
  callDirections: ("inbound" | "outbound")[];
  createdAt: Date;
  updatedAt: Date;
}

const pastConversationSchema = new Schema<IPastConversation>(
  {
    date: { type: Date, default: Date.now },
    summary: { type: String, trim: true, default: "" },
    summary_en: { type: String, trim: true, default: "" },
    summary_hi: { type: String, trim: true, default: "" },
    next_step: { type: String, trim: true, default: "" },
    sentiment: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const customerSchema = new Schema<ICustomer>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"]
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      // Validation will be handled in routes for better error messages
    },
    email: { type: String, trim: true, lowercase: true, default: "" },
    status: {
      type: String,
      enum: ["fresh", "interested", "not_interested", "booked", "NA", "queries"],
      default: "fresh",
    },
    pastConversations: { type: [pastConversationSchema], default: [] },
    callDirections: { type: [String], enum: ["inbound", "outbound"], default: [] },
  },
  { timestamps: true }
);

// One phone number per user account — prevents duplicates within a user's CRM
customerSchema.index({ userId: 1, phoneNumber: 1 }, { unique: true });
// Query performance indexes
customerSchema.index({ userId: 1, status: 1 });
customerSchema.index({ userId: 1, createdAt: -1 });
customerSchema.index({ userId: 1, callDirections: 1 });
customerSchema.index({ userId: 1, callDirections: 1 });

// Apply tenant isolation plugin
customerSchema.plugin(tenantPlugin);

export const Customer = mongoose.model<ICustomer>("Customer", customerSchema);
