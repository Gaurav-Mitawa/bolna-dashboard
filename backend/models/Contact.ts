import mongoose, { Schema, Document } from "mongoose";
import { tenantPlugin } from "../plugins/tenantPlugin.js";

export interface IContact extends Document {
    name: string;
    userId: string;
    email: string;
    phone: string;
    tag: string; // status: purchased, converted, fresh, not_interested, etc.
    source: string; // pms, website, bolna_inbound, bolna_outbound
    call_count: number;
    total_call_duration: number;
    last_call_date: Date | null;
    last_call_summary: string;
    last_call_agent: string;
    created_at: Date;
    updated_at: Date;
}

const ContactSchema = new Schema<IContact>({
    name: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    email: { type: String, default: "" },
    phone: { type: String, required: true },
    tag: { type: String, default: "fresh" },
    source: { type: String, default: "unknown" },
    call_count: { type: Number, default: 0 },
    total_call_duration: { type: Number, default: 0 },
    last_call_date: { type: Date, default: null },
    last_call_summary: { type: String, default: "" },
    last_call_agent: { type: String, default: "" },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

// Compound index: phone uniqueness is per-user (not global)
ContactSchema.index({ userId: 1, phone: 1 }, { unique: true });
// Query performance indexes
ContactSchema.index({ userId: 1, created_at: -1 });
ContactSchema.index({ userId: 1, tag: 1 });

// Apply tenant isolation plugin
ContactSchema.plugin(tenantPlugin);

export const Contact = mongoose.model<IContact>("Contact", ContactSchema);
