/**
 * All call-processor API routes in one file.
 */
import { Router, Request, Response } from "express";
import { processNewCalls } from "../services/callProcessor.js";
import { Call } from "../models/Call.js";

const router = Router();

/**
 * POST /api/internal/process-calls
 * Manually trigger the polling + LLM + save pipeline.
 */
router.post("/internal/process-calls", async (_req: Request, res: Response) => {
    try {
        const result = await processNewCalls();
        res.json({ success: true, ...result });
    } catch (err: any) {
        console.error("[Route] process-calls error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/call-bookings
 * Returns calls where LLM detected a booking (is_booked = true).
 * Query params: direction (inbound/outbound)
 */
router.get("/call-bookings", async (req: Request, res: Response) => {
    try {
        const query: any = {
            "llm_analysis.booking.is_booked": true,
        };

        if (req.query.direction) {
            query.call_direction = req.query.direction;
        }

        const bookings = await Call.find(query)
            .sort({ call_timestamp: -1 })
            .lean();
        res.json(bookings);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/queries-calls
 * Returns processed calls where LLM intent = "queries".
 * Query params: direction (inbound/outbound)
 */
router.get("/queries-calls", async (req: Request, res: Response) => {
    try {
        const query: any = {
            processed: true,
            "llm_analysis.intent": "queries",
        };

        if (req.query.direction) {
            query.call_direction = req.query.direction;
        }

        const calls = await Call.find(query)
            .sort({ call_timestamp: -1 })
            .lean();
        res.json(calls);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/call-bookings/:call_id
 * Single booking detail.
 */
router.get("/call-bookings/:call_id", async (req: Request, res: Response) => {
    try {
        const doc = await Call.findOne({ call_id: req.params.call_id }).lean();
        if (!doc) return res.status(404).json({ error: "Not found" });
        res.json(doc);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/processed-calls
 * All processed calls with summary + intent.
 * Query params: direction (inbound/outbound), intent (any intent type)
 */
router.get("/processed-calls", async (req: Request, res: Response) => {
    try {
        const query: any = { processed: true };

        if (req.query.direction) {
            query.call_direction = req.query.direction;
        }

        if (req.query.intent) {
            query["llm_analysis.intent"] = req.query.intent;
        }

        const calls = await Call.find(query)
            .sort({ call_timestamp: -1 })
            .lean();
        res.json(calls);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/processed-calls/:call_id
 * Single call detail.
 */
router.get("/processed-calls/:call_id", async (req: Request, res: Response) => {
    try {
        const doc = await Call.findOne({ call_id: req.params.call_id }).lean();
        if (!doc) return res.status(404).json({ error: "Not found" });
        res.json(doc);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/internal/call-status/:call_id
 * Check processing status of a specific call.
 */
router.get("/internal/call-status/:call_id", async (req: Request, res: Response) => {
    try {
        const doc = await Call.findOne({ call_id: req.params.call_id }).lean();
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
