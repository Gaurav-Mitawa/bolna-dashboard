/**
 * MongoDB Migration: Add new LLM analysis fields
 * Run this once to ensure backward compatibility for existing call records
 * 
 * Usage: node migrations/add-llm-analysis-fields.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/voice-analytics";

async function runMigration() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✓ Connected to MongoDB");

        const Call = mongoose.model("Call", new mongoose.Schema({}, { strict: false }));

        // Update all calls that have llm_analysis but missing new fields
        const updateResult = await Call.updateMany(
            {
                llm_analysis: { $exists: true, $ne: null },
                $or: [
                    { "llm_analysis.summary_en": { $exists: false } },
                    { "llm_analysis.summary_hi": { $exists: false } },
                    { "llm_analysis.next_step": { $exists: false } },
                    { "llm_analysis.sentiment": { $exists: false } }
                ]
            },
            {
                $set: {
                    "llm_analysis.summary_en": "$llm_analysis.summary",
                    "llm_analysis.summary_hi": "",
                    "llm_analysis.next_step": "",
                    "llm_analysis.sentiment": "neutral"
                }
            }
        );

        console.log(`✓ Migration complete. Updated ${updateResult.modifiedCount || 0} documents`);
        console.log(`✓ Matched ${updateResult.matchedCount || 0} documents`);

        await mongoose.disconnect();
        console.log("✓ Disconnected from MongoDB");
    } catch (error) {
        console.error("✗ Migration failed:", error.message);
        process.exit(1);
    }
}

runMigration();
