import mongoose, { Schema, Document } from "mongoose";

export interface ICall extends Document {
    call_id: string;
    userId: string;
    agent_id: string;
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
        intent: string;
        booking: {
            is_booked: boolean;
            date: string | null;
            time: string | null;
            raw_datetime_string: string | null;
        };
    } | null;
    processed: boolean;
    raw_llm_output: string | null;
    created_at: Date;
}

const CallSchema = new Schema<ICall>({
    call_id: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    agent_id: { type: String, required: true },
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
    raw_llm_output: { type: String, default: null },
    created_at: { type: Date, default: Date.now },
});

export const Call = mongoose.model<ICall>("Call", CallSchema);
