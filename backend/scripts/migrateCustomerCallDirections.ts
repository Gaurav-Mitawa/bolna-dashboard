import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function migrateCustomerCallDirections() {
  console.log("[Migration] Starting callDirections migration...");
  console.log("[Migration] MongoDB URI:", process.env.MONGODB_URI ? "Loaded from .env" : "Not found, using default");

  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/bolna-clusterx";

  try {
    await mongoose.connect(mongoUri);
    console.log("[Migration] Connected to MongoDB");

    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection not established");

    const customersCollection = db.collection("customers");
    const callsCollection = db.collection("calls");

    const customers = await customersCollection.find({}).toArray();
    console.log(`[Migration] Found ${customers.length} customers to process`);

    let updatedCount = 0;
    let noCallsCount = 0;

    for (const customer of customers) {
      const calls = await callsCollection
        .find({
          userId: customer.userId.toString(),
          caller_number: customer.phoneNumber,
        })
        .sort({ created_at: -1 })
        .project({ call_direction: 1 })
        .toArray();

      if (calls.length === 0) {
        noCallsCount++;
        continue;
      }

      const directions = new Set<string>();
      calls.forEach((call: any) => {
        if (call.call_direction === "inbound" || call.call_direction === "outbound") {
          directions.add(call.call_direction);
        }
      });

      const directionsArray = Array.from(directions) as ("inbound" | "outbound")[];

      if (directionsArray.length > 0) {
        const existingDirections = customer.callDirections || [];
        const hasChanged =
          directionsArray.length !== existingDirections.length ||
          !directionsArray.every((d) => existingDirections.includes(d));

        if (hasChanged) {
          await customersCollection.updateOne(
            { _id: customer._id },
            { $set: { callDirections: directionsArray } }
          );
          updatedCount++;
        }
      }
    }

    console.log(`[Migration] Migration complete!`);
    console.log(`[Migration] Updated: ${updatedCount} customers`);
    console.log(`[Migration] No calls found: ${noCallsCount} customers`);
    console.log(`[Migration] Unchanged: ${customers.length - updatedCount - noCallsCount} customers`);
  } catch (error: any) {
    console.error("[Migration] Error:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("[Migration] Disconnected from MongoDB");
  }
}

migrateCustomerCallDirections();
