import mongoose, { Schema, Document } from "mongoose";

export interface IContact extends Document {
    name: string;
    email: string;
    phone: string;
    tag: string; // status: purchased, converted, fresh, not_interested, etc.
    source: string; // pms, website, bolna_inbound, bolna_outbound
    call_count: number;
    total_call_duration: number;
    last_call_date: Date | null;
    last_call_summary: string;
    created_at: Date;
    updated_at: Date;
}

const ContactSchema = new Schema<IContact>({
    name: { type: String, required: true },
    email: { type: String, default: "" },
    phone: { type: String, required: true, unique: true, index: true },
    tag: { type: String, default: "fresh" },
    source: { type: String, default: "unknown" },
    call_count: { type: Number, default: 0 },
    total_call_duration: { type: Number, default: 0 },
    last_call_date: { type: Date, default: null },
    last_call_summary: { type: String, default: "" },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

export const Contact = mongoose.model<IContact>("Contact", ContactSchema);
