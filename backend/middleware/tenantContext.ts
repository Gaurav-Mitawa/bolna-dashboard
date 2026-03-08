/**
 * Tenant Context Middleware
 *
 * Runs after authentication to extract the tenant ID (userId) from the session
 * and attach it to the request for use across routes and services.
 *
 * This ensures every authenticated request has a consistent, type-safe
 * way to access the current tenant's ID.
 */
import { Request, Response, NextFunction } from "express";

// Extend Express Request to include tenantId
declare global {
    namespace Express {
        interface Request {
            tenantId: string;
        }
    }
}

/**
 * Middleware that extracts the authenticated user's ID and sets req.tenantId.
 * Must run AFTER isAuthenticated middleware.
 */
export function attachTenantContext(req: Request, res: Response, next: NextFunction) {
    const user = req.user as any;

    if (!user || !user._id) {
        return res.status(401).json({ error: "Tenant context: user not authenticated" });
    }

    // Set tenantId as a string (consistent across ObjectId and string userId fields)
    req.tenantId = user._id.toString();

    next();
}
