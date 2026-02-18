import mongoose, { Schema, Document } from "mongoose";

export interface ICall extends Document {
    call_id: string;
    agent_id: string;
    caller_number: string;
    call_duration: number;
    call_timestamp: string;
    transcript: string;
    call_direction: string;
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
    call_id: { type: String, required: true, unique: true, index: true },
    agent_id: { type: String, required: true },
    caller_number: { type: String, default: "" },
    call_duration: { type: Number, default: 0 },
    call_timestamp: { type: String, default: "" },
    transcript: { type: String, default: "" },
    call_direction: { type: String, default: "unknown" },
    llm_analysis: {
        type: Schema.Types.Mixed,
        default: null,
    },
    processed: { type: Boolean, default: false },
    raw_llm_output: { type: String, default: null },
    created_at: { type: Date, default: Date.now },
});

export const Call = mongoose.model<ICall>("Call", CallSchema);
