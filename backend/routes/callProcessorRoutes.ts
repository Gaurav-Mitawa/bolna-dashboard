/**
 * All call-processor API routes in one file.
 * FIXED: All queries now include userId filter for tenant isolation.
 */
import { Router, Request, Response } from "express";
import { processNewCalls } from "../services/callProcessor.js";
import { Call } from "../models/Call.js";
import { isAuthenticated, isSubscribed, hasBolnaKey } from "../middleware/auth.js";
import { getApiKey } from "../services/bolnaService.js";

const router = Router();

/**
 * POST /api/internal/process-calls
 * Manually trigger the polling + LLM + save pipeline for the authenticated user.
 */
router.post("/internal/process-calls", isAuthenticated, isSubscribed, hasBolnaKey, async (req: Request, res: Response) => {
    try {
        const userId = req.tenantId;
        const apiKey = getApiKey(req.user as any);
        const result = await processNewCalls(userId, apiKey);
        res.json({ success: true, ...result });
    } catch (err: any) {
        console.error("[Route] process-calls error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/call-bookings
 * Returns calls where LLM detected a booking (is_booked = true) OR intent is "interested".
 * Query params: direction (inbound/outbound)
 */
router.get("/call-bookings", isAuthenticated, isSubscribed, async (req: Request, res: Response) => {
    try {
        const userId = req.tenantId;
        const query: any = {
            userId,
            status: "booked"
        };

        if (req.query.direction) {
            query.call_direction = req.query.direction;
        }

        const bookings = await Call.find(query)
            .sort({ created_at: -1 })
            .lean();
        res.json(bookings);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/queries-calls
 * Returns ALL LLM-processed calls (all intents) for the authenticated user.
 * Query params: direction (inbound/outbound)
 */
router.get("/queries-calls", isAuthenticated, isSubscribed, async (req: Request, res: Response) => {
    try {
        const userId = req.tenantId;
        const query: any = {
            userId,
            processed: true,
            llm_analysis: { $ne: null },
        };

        if (req.query.direction) {
            query.call_direction = req.query.direction;
        }

        const calls = await Call.find(query)
            .sort({ created_at: -1 })
            .lean();
        res.json(calls);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/call-bookings/:call_id
 * Single booking detail — scoped to current user.
 */
router.get("/call-bookings/:call_id", isAuthenticated, isSubscribed, async (req: Request, res: Response) => {
    try {
        const userId = req.tenantId;
        const doc = await Call.findOne({ call_id: req.params.call_id, userId }).lean();
        if (!doc) return res.status(404).json({ error: "Not found" });
        res.json(doc);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/processed-calls
 * All processed calls with summary + intent — scoped to current user.
 * Query params: direction (inbound/outbound), intent (any intent type)
 */
router.get("/processed-calls", isAuthenticated, isSubscribed, async (req: Request, res: Response) => {
    try {
        const userId = req.tenantId;
        const query: any = { userId, processed: true };

        if (req.query.direction) {
            query.call_direction = req.query.direction;
        }

        if (req.query.intent) {
            query["llm_analysis.intent"] = req.query.intent;
        }

        const calls = await Call.find(query)
            .sort({ created_at: -1 })
            .lean();
        res.json(calls);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/processed-calls/:call_id
 * Single call detail — scoped to current user.
 */
router.get("/processed-calls/:call_id", isAuthenticated, isSubscribed, async (req: Request, res: Response) => {
    try {
        const userId = req.tenantId;
        const doc = await Call.findOne({ call_id: req.params.call_id, userId }).lean();
        if (!doc) return res.status(404).json({ error: "Not found" });
        res.json(doc);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/internal/call-status/:call_id
 * Check processing status of a specific call — scoped to current user.
 */
router.get("/internal/call-status/:call_id", isAuthenticated, async (req: Request, res: Response) => {
    try {
        const userId = req.tenantId;
        const doc = await Call.findOne({ call_id: req.params.call_id, userId }).lean();
        if (!doc) return res.status(404).json({ exists: false });
        res.json({
            exists: true,
            processed: doc.processed,
            intent: doc.llm_analysis?.intent || null,
            is_booked: doc.llm_analysis?.booking?.is_booked || false,
            call_direction: doc.call_direction || "unknown",
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
