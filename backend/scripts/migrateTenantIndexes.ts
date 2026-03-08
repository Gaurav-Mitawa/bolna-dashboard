/**
 * Tenant Index Migration Script
 *
 * Migrates MongoDB indexes for multi-tenant isolation:
 * 1. Drops standalone unique indexes on Contact.phone and Call.call_id
 * 2. Creates compound indexes: {userId, phone} and {userId, call_id}
 * 3. Adds performance indexes for tenant-scoped queries
 *
 * Usage:
 *   npx tsx backend/scripts/migrateTenantIndexes.ts
 *
 * IMPORTANT: Take a MongoDB snapshot/backup before running this script.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("[Migration] MONGODB_URI not set in .env");
    process.exit(1);
}

async function dropIndexSafe(collection: any, indexName: string) {
    try {
        await collection.dropIndex(indexName);
        console.log(`  ✓ Dropped index "${indexName}"`);
    } catch (err: any) {
        if (err.codeName === "IndexNotFound" || err.code === 27) {
            console.log(`  - Index "${indexName}" not found (already dropped or never existed)`);
        } else {
            console.error(`  ✗ Error dropping "${indexName}":`, err.message);
        }
    }
}

async function createIndexSafe(
    collection: any,
    spec: Record<string, any>,
    options: Record<string, any> = {}
) {
    const name = options.name || Object.entries(spec).map(([k, v]) => `${k}_${v}`).join("_");
    try {
        await collection.createIndex(spec, { ...options, background: true });
        console.log(`  ✓ Created index "${name}": ${JSON.stringify(spec)}`);
    } catch (err: any) {
        if (err.code === 85 || err.code === 86) {
            console.log(`  - Index "${name}" already exists with compatible spec`);
        } else {
            console.error(`  ✗ Error creating "${name}":`, err.message);
        }
    }
}

async function migrate() {
    console.log("[Migration] Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI!);
    console.log("[Migration] Connected.\n");

    const db = mongoose.connection.db!;

    // ─── Contact Collection ──────────────────────────────────────────────────
    console.log("=== Contact Collection ===");
    const contacts = db.collection("contacts");

    // List existing indexes for reference
    const contactIndexes = await contacts.indexes();
    console.log("  Current indexes:", contactIndexes.map((i: any) => i.name).join(", "));

    // Drop standalone phone unique index (if exists)
    await dropIndexSafe(contacts, "phone_1");

    // Create compound tenant-scoped indexes
    await createIndexSafe(contacts, { userId: 1, phone: 1 }, { unique: true, name: "userId_phone_unique" });
    await createIndexSafe(contacts, { userId: 1, created_at: -1 }, { name: "userId_created_at" });
    await createIndexSafe(contacts, { userId: 1, tag: 1 }, { name: "userId_tag" });

    // ─── Call Collection ─────────────────────────────────────────────────────
    console.log("\n=== Call Collection ===");
    const calls = db.collection("calls");

    const callIndexes = await calls.indexes();
    console.log("  Current indexes:", callIndexes.map((i: any) => i.name).join(", "));

    // Drop standalone call_id unique index (if exists)
    await dropIndexSafe(calls, "call_id_1");

    // Create compound tenant-scoped indexes
    await createIndexSafe(calls, { userId: 1, call_id: 1 }, { unique: true, name: "userId_call_id_unique" });
    await createIndexSafe(calls, { userId: 1, created_at: -1 }, { name: "userId_created_at" });
    await createIndexSafe(calls, { userId: 1, processed: 1 }, { name: "userId_processed" });
    await createIndexSafe(calls, { userId: 1, caller_number: 1 }, { name: "userId_caller_number" });

    // ─── Campaign Collection ─────────────────────────────────────────────────
    console.log("\n=== Campaign Collection ===");
    const campaigns = db.collection("campaigns");

    const campaignIndexes = await campaigns.indexes();
    console.log("  Current indexes:", campaignIndexes.map((i: any) => i.name).join(", "));

    await createIndexSafe(campaigns, { userId: 1, status: 1 }, { name: "userId_status" });
    await createIndexSafe(campaigns, { userId: 1, createdAt: -1 }, { name: "userId_createdAt" });

    // ─── Customer Collection ─────────────────────────────────────────────────
    console.log("\n=== Customer Collection ===");
    const customers = db.collection("customers");

    const customerIndexes = await customers.indexes();
    console.log("  Current indexes:", customerIndexes.map((i: any) => i.name).join(", "));

    // Already has {userId: 1, phoneNumber: 1} unique — just add performance indexes
    await createIndexSafe(customers, { userId: 1, status: 1 }, { name: "userId_status" });
    await createIndexSafe(customers, { userId: 1, createdAt: -1 }, { name: "userId_createdAt" });

    // ─── Payment Collection ──────────────────────────────────────────────────
    console.log("\n=== Payment Collection ===");
    const payments = db.collection("payments");

    const paymentIndexes = await payments.indexes();
    console.log("  Current indexes:", paymentIndexes.map((i: any) => i.name).join(", "));

    await createIndexSafe(payments, { userId: 1, status: 1 }, { name: "userId_status" });
    await createIndexSafe(payments, { userId: 1, createdAt: -1 }, { name: "userId_createdAt" });

    // ─── Verification ────────────────────────────────────────────────────────
    console.log("\n=== Verification ===");
    for (const [name, collName] of [
        ["Contact", "contacts"],
        ["Call", "calls"],
        ["Campaign", "campaigns"],
        ["Customer", "customers"],
        ["Payment", "payments"],
    ]) {
        const coll = db.collection(collName);
        const indexes = await coll.indexes();
        console.log(`  ${name}: ${indexes.map((i: any) => i.name).join(", ")}`);
    }

    console.log("\n[Migration] Done. Disconnecting...");
    await mongoose.disconnect();
    console.log("[Migration] Disconnected.");
}

migrate().catch((err) => {
    console.error("[Migration] Fatal error:", err);
    process.exit(1);
});
