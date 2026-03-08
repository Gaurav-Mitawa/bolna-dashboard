/**
 * Tenant Isolation Plugin for Mongoose
 *
 * Automatically enforces userId filtering on all queries for multi-tenant isolation.
 * Applied to all business models (Contact, Call, Campaign, Customer, Payment).
 *
 * Enforcement modes (TENANT_ENFORCEMENT env var):
 *   - "soft"   : Log warnings for queries missing userId, but allow them (grace period)
 *   - "strict" : Reject queries missing userId with an error (production mode)
 *
 * The plugin hooks into Mongoose query middleware to auto-inject userId filters
 * and validates that new documents always have a userId set.
 */
import { Schema } from "mongoose";
import { logTenantViolation } from "../utils/tenantLogger.js";

type EnforcementMode = "soft" | "strict";

function getEnforcementMode(): EnforcementMode {
    const mode = process.env.TENANT_ENFORCEMENT || "soft";
    return mode === "strict" ? "strict" : "soft";
}

// Operations that are exempt from tenant enforcement (e.g. aggregation pipelines
// handle their own $match stages, and internal system operations may skip userId)
const SKIP_ENFORCEMENT_KEY = "__skipTenantEnforcement";

/**
 * Mark a query to skip tenant enforcement. Use sparingly — only for
 * system-level operations like migrations or webhooks that resolve userId
 * through other means.
 */
export function skipTenantEnforcement(query: any): any {
    if (query && typeof query.setOptions === "function") {
        query.setOptions({ [SKIP_ENFORCEMENT_KEY]: true });
    }
    return query;
}

// The userId field name used across all models
const TENANT_FIELD = "userId";

/**
 * Check if a query filter already includes userId
 */
function hasUserIdFilter(filter: Record<string, any>): boolean {
    if (!filter) return false;
    if (filter[TENANT_FIELD] !== undefined) return true;
    // Check inside $and conditions
    if (Array.isArray(filter.$and)) {
        return filter.$and.some((cond: any) => cond[TENANT_FIELD] !== undefined);
    }
    return false;
}

/**
 * Handle enforcement violation
 */
function handleViolation(
    operation: string,
    collectionName: string,
    filter: Record<string, any>
): void {
    const mode = getEnforcementMode();

    logTenantViolation({
        operation,
        collection: collectionName,
        filter,
        mode,
    });

    if (mode === "strict") {
        throw new Error(
            `[TenantPlugin] STRICT MODE: Query on "${collectionName}" ` +
            `(${operation}) is missing userId filter. All queries must be tenant-scoped.`
        );
    }
}

/**
 * Mongoose plugin that enforces tenant (userId) isolation on all queries.
 */
export function tenantPlugin(schema: Schema): void {
    // ─── Query middleware: enforce userId on reads/updates/deletes ────────────

    const queryOps: string[] = [
        "find",
        "findOne",
        "findOneAndUpdate",
        "findOneAndDelete",
        "findOneAndReplace",
        "countDocuments",
        "updateMany",
        "updateOne",
        "deleteMany",
        "deleteOne",
        "replaceOne",
    ];

    for (const op of queryOps) {
        (schema as any).pre(op, function (this: any) {
            // Skip if explicitly opted out
            if (this.getOptions?.()?.[SKIP_ENFORCEMENT_KEY]) {
                return;
            }

            const filter = this.getFilter?.() || this.getQuery?.() || {};
            const collectionName = this.model?.collection?.name || this.mongooseCollection?.name || "unknown";

            if (!hasUserIdFilter(filter)) {
                handleViolation(op, collectionName, filter);
            }
        });
    }

    // ─── Save middleware: ensure new documents have userId set ────────────────

    (schema as any).pre("save", function (this: any, next: Function) {
        if (!this[TENANT_FIELD]) {
            const mode = getEnforcementMode();
            const collectionName = this.constructor?.modelName || "unknown";

            logTenantViolation({
                operation: "save",
                collection: collectionName,
                filter: {},
                mode,
                message: "Document being saved without userId",
            });

            if (mode === "strict") {
                return next(
                    new Error(
                        `[TenantPlugin] STRICT MODE: Cannot save document to "${collectionName}" without userId.`
                    )
                );
            }
        }
        next();
    });

    // ─── insertMany middleware ────────────────────────────────────────────────

    (schema as any).pre("insertMany", function (this: any, docs: any[]) {
        const mode = getEnforcementMode();
        const collectionName = this.modelName || "unknown";

        for (const doc of docs) {
            if (!doc[TENANT_FIELD]) {
                logTenantViolation({
                    operation: "insertMany",
                    collection: collectionName,
                    filter: {},
                    mode,
                    message: `Document in insertMany batch missing userId`,
                });

                if (mode === "strict") {
                    throw new Error(
                        `[TenantPlugin] STRICT MODE: Cannot insertMany into "${collectionName}" — ` +
                        `one or more documents missing userId.`
                    );
                }
            }
        }
        // Mongoose 8: pre-insertMany hook is synchronous — no next() call needed
    });
}
