import mongoose, { Schema, Document } from "mongoose";

/**
 * Agent — MongoDB document representing a Bolna voice agent.
 * This is the single source of tenant ownership for the background poller.
 * Every call record written by the poller must derive its userId from here,
 * never from the Bolna API response.
 */
export interface IAgent extends Document {
  userId: string;        // MongoDB User._id — the tenant that owns this agent
  bolnaAgentId: string;  // The agent ID as known by Bolna API
  agentName: string;
  isActive: boolean;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AgentSchema = new Schema<IAgent>(
  {
    userId: { type: String, required: true, index: true },
    bolnaAgentId: { type: String, required: true, unique: true, index: true },
    agentName: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    lastSyncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Agent = mongoose.model<IAgent>("Agent", AgentSchema);
