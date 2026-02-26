import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "./models/User.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "";

if (!MONGODB_URI) {
    console.warn("[DB] MONGODB_URI not set in .env — MongoDB will not connect");
}

async function fix100YearTrials() {
    try {
        const users = await User.find({
            trialExpiresAt: { $gt: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000) }
        });
        if (users.length > 0) {
            console.log(`[DB Fix] Found ${users.length} users with 100-year trials. Fixing...`);
            for (const user of users) {
                if (user.trialStartedAt) {
                    user.trialExpiresAt = new Date(user.trialStartedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
                    if (user.subscriptionStatus === "active" && !user.subscriptionExpiresAt) {
                        user.subscriptionStatus = "trial";
                    }
                    await user.save();
                    console.log(`[DB Fix] Updated trial for ${user.email} out of 100-year loop.`);
                }
            }
        }
    } catch (err) {
        console.error("[DB Fix] Error fixing trials:", err);
    }
}

export async function connectDB() {
    if (!MONGODB_URI) return;
    try {
        await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
        console.log("[DB] MongoDB Atlas connected");
        await fix100YearTrials();
    } catch (err: any) {
        console.error("[DB] MongoDB connection failed:", err.message);
        console.error("[DB] Server will start but DB operations will fail.");
        console.error("[DB] → Whitelist your IP in Atlas: https://www.mongodb.com/docs/atlas/security-whitelist/");
    }
}

export default mongoose;
