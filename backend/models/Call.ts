import mongoose, { Schema, Document } from "mongoose";
import { tenantPlugin } from "../plugins/tenantPlugin.js";

export interface ICall extends Document {
    call_id: string;        // bolnaCallId — Bolna-side unique ID, used as dedup key
    userId: string;         // which tenant owns this call (from MongoDB Agent doc, never from Bolna)
    agent_id: string;       // Bolna agent ID string
    batch_id: string | null; // which Bolna campaign batch this call belongs to (nullable)
    caller_number: string;
    call_duration: number;
    call_timestamp: string;
    transcript: string;
    call_direction: string;
    agent_name: string;
    total_cost: number;
    cost_breakdown: {
        llm: number;
        network: number;
        platform: number;
        synthesizer: number;
        transcriber: number;
    } | null;
    recording_url: string;
    extracted_data: Record<string, any> | null;
    llm_analysis: {
        summary: string;
        summary_en: string;
        summary_hi: string;
        intent: string;
        next_step: string;
        sentiment: string;
        customer_name: string | null;
        booking: {
            is_booked: boolean;
            date: string | null;
            time: string | null;
            raw_datetime_string: string | null;
        };
    } | null;
    processed: boolean;
    llm_retries: number;           // how many times LLM analysis has been attempted and failed
    raw_llm_output: string | null;
    bolna_updated_at: Date | null; // updated_at from Bolna — used by poller for change detection
    synced_at: Date | null;        // when this record was last synced by the poller
    status: string | null;
    created_at: Date;
}

const CallSchema = new Schema<ICall>({
    call_id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },

    agent_id: { type: String, required: true },
    batch_id: { type: String, default: null, index: true },
    caller_number: { type: String, default: "" },
    call_duration: { type: Number, default: 0 },
    call_timestamp: { type: String, default: "" },
    transcript: { type: String, default: "" },
    call_direction: { type: String, default: "unknown" },
    agent_name: { type: String, default: "" },
    total_cost: { type: Number, default: 0 },
    cost_breakdown: { type: Schema.Types.Mixed, default: null },
    recording_url: { type: String, default: "" },
    extracted_data: { type: Schema.Types.Mixed, default: null },
    llm_analysis: {
        type: Schema.Types.Mixed,
        default: null,
    },
    processed: { type: Boolean, default: false },
    llm_retries: { type: Number, default: 0 },
    raw_llm_output: { type: String, default: null },
    bolna_updated_at: { type: Date, default: null },
    synced_at: { type: Date, default: null },
    status: { type: String, default: null, index: true },
    created_at: { type: Date, default: Date.now },
});

// Compound index: call_id uniqueness is per-user
CallSchema.index({ userId: 1, call_id: 1 }, { unique: true });
// Query performance indexes
CallSchema.index({ userId: 1, created_at: -1 });
CallSchema.index({ userId: 1, processed: 1 });
CallSchema.index({ userId: 1, caller_number: 1 });

// Apply tenant isolation plugin
CallSchema.plugin(tenantPlugin);

export const Call = mongoose.model<ICall>("Call", CallSchema);
