/**
 * Tenant Audit Logger
 *
 * Logs every tenant enforcement violation with structured data for monitoring.
 * In soft mode: warnings only. In strict mode: also used before throwing errors.
 */

interface TenantViolation {
    operation: string;
    collection: string;
    filter: Record<string, any>;
    mode: "soft" | "strict";
    message?: string;
}

/**
 * Log a tenant enforcement violation.
 * Captures timestamp, operation, collection, and a truncated stack trace.
 */
export function logTenantViolation(violation: TenantViolation): void {
    const timestamp = new Date().toISOString();
    const stack = new Error().stack
        ?.split("\n")
        .slice(2, 6) // Get 4 relevant stack frames
        .map((line) => line.trim())
        .join(" → ");

    const severity = violation.mode === "strict" ? "ERROR" : "WARN";

    console.warn(
        `[TenantEnforcement] [${severity}] ${timestamp} | ` +
        `${violation.operation} on "${violation.collection}" | ` +
        `${violation.message || "Query missing userId filter"} | ` +
        `Filter: ${JSON.stringify(violation.filter)} | ` +
        `Stack: ${stack || "N/A"}`
    );
}
