import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "./backend/models/User.js";

dotenv.config();

async function fixTrials() {
    const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/bolna-dashboard";
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB.");

    // Find users with trialExpiresAt > 2 years from now (clearly 100 year bypassers)
    const users = await User.find({
        trialExpiresAt: { $gt: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000) }
    });

    console.log(`Found ${users.length} users with 100-year trials.`);

    let updated = 0;
    for (const user of users) {
        if (user.trialStartedAt) {
            // Reset trialExpiresAt to exactly 7 days after trialStartedAt
            const newExpire = new Date(user.trialStartedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
            user.trialExpiresAt = newExpire;

            // If it's still "active" from the bypass, set it back to "trial"
            if (user.subscriptionStatus === "active" && !user.subscriptionExpiresAt) {
                user.subscriptionStatus = "trial";
            }

            await user.save();
            updated++;
            console.log(`Updated user ${user.email} -> new trial expires: ${newExpire.toISOString()}`);
        }
    }

    console.log(`Fixed ${updated} users.`);
    process.exit(0);
}

fixTrials().catch(console.error);
