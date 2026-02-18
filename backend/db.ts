import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "";

if (!MONGODB_URI) {
    console.warn("[DB] MONGODB_URI not set in .env — MongoDB will not connect");
}

export async function connectDB() {
    if (!MONGODB_URI) return;
    try {
        await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
        console.log("[DB] MongoDB Atlas connected");
    } catch (err: any) {
        console.error("[DB] MongoDB connection failed:", err.message);
        console.error("[DB] Server will start but DB operations will fail.");
        console.error("[DB] → Whitelist your IP in Atlas: https://www.mongodb.com/docs/atlas/security-whitelist/");
    }
}

export default mongoose;
