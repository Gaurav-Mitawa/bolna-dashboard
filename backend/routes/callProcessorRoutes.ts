/**
 * Call-processor API routes (Phase 10 — MongoDB as SSOT)
 *
 * All queries are scoped to req.user.id — tenant isolation is enforced on every route.
 * The frontend never calls Bolna for data reads; it always reads from MongoDB here.
 */
import { Router, Request, Response } from "express";
import { runSyncPoller } from "../services/syncPoller.js";
import { Call } from "../models/Call.js";
import { isAuthenticated, isSubscribed } from "../middleware/auth.js";

const router = Router();

// ─── Internal / Admin ─────────────────────────────────────────────────────────

/**
 * POST /api/internal/process-calls
 * Manually trigger the full sync poller (requires auth).
 */
router.post(
    "/internal/process-calls",
    isAuthenticated,
    async (_req: Request, res: Response) => {
        try {
            // Run async — respond immediately
            runSyncPoller().catch(err =>
                console.error("[Route] Manual process-calls error:", err)
            );
            res.json({ success: true, message: "Sync poller triggered" });
        } catch (err: any) {
            console.error("[Route] process-calls error:", err);
            res.status(500).json({ success: false, error: err.message });
        }
    }
);

// ─── Call History — MongoDB read (Phase 10 primary endpoint) ─────────────────

/**
 * GET /api/call-history
 * Returns all calls for the authenticated user from MongoDB.
 * Maps Call documents to BolnaExecution shape so CallHistory.tsx stays unchanged.
 *
 * Query params:
 *   agent_id   — filter by Bolna agent ID
 *   status     — filter by call status
 *   call_type  — filter by "inbound" | "outbound"
 *   page_number — 1-based page (default 1)
 *   page_size  — results per page (default 20, max 100)
 */
router.get(
    "/call-history",
    isAuthenticated,
    isSubscribed,
    async (req: Request, res: Response) => {
        try {
            const userId = (req.user as any)._id.toString();

            const page = Math.max(1, parseInt(req.query.page_number as string) || 1);
            const pageSize = Math.min(100, parseInt(req.query.page_size as string) || 20);
            const skip = (page - 1) * pageSize;

            // Always scope by userId — tenant isolation guarantee
            const filter: any = { userId };

            if (req.query.agent_id && req.query.agent_id !== "all") {
                filter.agent_id = req.query.agent_id;
            }
            if (req.query.status && req.query.status !== "all") {
                filter.status = req.query.status;
            }
            if (req.query.call_type && req.query.call_type !== "all") {
                filter.call_direction = req.query.call_type;
            }
            if (req.query.from) {
                filter.call_timestamp = { ...filter.call_timestamp, $gte: new Date(req.query.from as string) };
            }
            if (req.query.to) {
                filter.call_timestamp = { ...filter.call_timestamp, $lte: new Date(req.query.to as string) };
            }

            const [total, calls] = await Promise.all([
                Call.countDocuments(filter),
                Call.find(filter)
                    .sort({ call_timestamp: -1 })
                    .skip(skip)
                    .limit(pageSize)
                    .lean(),
            ]);

            // Map MongoDB Call → BolnaExecution shape (frontend stays unchanged)
            const data = calls.map(c => ({
                id: c.call_id,
                agent_id: c.agent_id,
                batch_id: c.batch_id || null,
                conversation_time: c.call_duration,
                total_cost: c.total_cost,
                cost_breakdown: c.cost_breakdown || null,
                status: (c as any).status || (c.processed ? "completed" : "failed"),
                transcript: c.transcript || null,
                created_at: c.call_timestamp,
                extracted_data: c.extracted_data || null,
                llm_analysis: c.llm_analysis || null,
                telephony_data: {
                    to_number: c.call_direction === "outbound" ? c.caller_number : null,
                    from_number: c.call_direction === "inbound" ? c.caller_number : null,
                    call_type: c.call_direction,
                    recording_url: c.recording_url || null,
                },
                // Extra fields for detail modal
                agent_name: c.agent_name,
                call_direction: c.call_direction,
                caller_number: c.caller_number,
            }));

            res.json({
                data,
                total,
                has_more: skip + pageSize < total,
                page_number: page,
                page_size: pageSize,
            });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }
);

/**
 * GET /api/call-history/agents
 * Returns the distinct Bolna agent IDs + names from the user's call records.
 * Used to populate the agent filter dropdown in CallHistory.tsx.
 */
router.get(
    "/call-history/agents",
    isAuthenticated,
    isSubscribed,
    async (req: Request, res: Response) => {
        try {
            const userId = (req.user as any)._id.toString();
            const agentData = await Call.aggregate([
                { $match: { userId } },
                { $group: { _id: "$agent_id", agent_name: { $first: "$agent_name" } } },
                { $project: { id: "$_id", agent_name: 1, _id: 0 } },
            ]);
            res.json(agentData);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }
);

// ─── Bookings & Processed Calls — scoped to req.user.id ──────────────────────

/**
 * GET /api/call-bookings
 * Returns calls where LLM detected a booking (is_booked=true or intent="booked").
 * Always scoped to the authenticated user.
 */
router.get(
    "/call-bookings",
    isAuthenticated,
    isSubscribed,
    async (req: Request, res: Response) => {
        try {
            const userId = (req.user as any)._id.toString();

            // Aggregation: group by caller_number, take LATEST processed call per person,
            // then filter to only those where the latest call still has is_booked=true.
            // This ensures a repeat caller who cancels is automatically removed from /bookings.
            const pipeline: any[] = [
                {
                    $match: {
                        userId,
                        processed: true,
                        llm_analysis: { $ne: null },
                        ...(req.query.direction ? { call_direction: req.query.direction } : {}),
                    },
                },
                { $sort: { call_timestamp: -1 } },
                {
                    $group: {
                        _id: "$caller_number",
                        latestCall: { $first: "$$ROOT" },
                    },
                },
                {
                    $match: {
                        $or: [
                            { "latestCall.llm_analysis.booking.is_booked": true },
                            { "latestCall.llm_analysis.intent": "booked" },
                        ],
                    },
                },
                { $replaceRoot: { newRoot: "$latestCall" } },
                { $sort: { call_timestamp: -1 } },
            ];

            const bookings = await Call.aggregate(pipeline);
            res.json(bookings);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }
);

/**
 * GET /api/queries-calls
 * Returns ALL LLM-processed calls for the authenticated user.
 */
router.get(
    "/queries-calls",
    isAuthenticated,
    isSubscribed,
    async (req: Request, res: Response) => {
        try {
            const userId = (req.user as any)._id.toString();

            const query: any = {
                userId,
                processed: true,
                llm_analysis: { $ne: null },
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
    }
);

/**
 * GET /api/call-bookings/:call_id
 * Single booking detail. Scoped to authenticated user.
 */
router.get(
    "/call-bookings/:call_id",
    isAuthenticated,
    isSubscribed,
    async (req: Request, res: Response) => {
        try {
            const userId = (req.user as any)._id.toString();
            const doc = await Call.findOne({
                call_id: req.params.call_id,
                userId,
            }).lean();
            if (!doc) return res.status(404).json({ error: "Not found" });
            res.json(doc);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }
);

/**
 * GET /api/processed-calls
 * All processed calls. Scoped to authenticated user.
 */
router.get(
    "/processed-calls",
    isAuthenticated,
    isSubscribed,
    async (req: Request, res: Response) => {
        try {
            const userId = (req.user as any)._id.toString();

            const query: any = { userId, processed: true };

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
    }
);

/**
 * GET /api/processed-calls/:call_id
 * Single call detail. Scoped to authenticated user.
 */
router.get(
    "/processed-calls/:call_id",
    isAuthenticated,
    isSubscribed,
    async (req: Request, res: Response) => {
        try {
            const userId = (req.user as any)._id.toString();
            const doc = await Call.findOne({
                call_id: req.params.call_id,
                userId,
            }).lean();
            if (!doc) return res.status(404).json({ error: "Not found" });
            res.json(doc);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    }
);

/**
 * PUT /api/call-bookings/:call_id
 * Update LLM summary fields (English + Hindi) for a booking.
 * Scoped to the authenticated user — only the owner can update.
 */
router.put(
    "/call-bookings/:call_id",
    isAuthenticated,
    isSubscribed,
    async (req: Request, res: Response) => {
        try {
            const userId = (req.user as any)._id.toString();
            const { summary, summary_en, summary_hi } = req.body;

            const update: any = {};
            if (summary    !== undefined) update["llm_analysis.summary"]    = summary;
            if (summary_en !== undefined) update["llm_analysis.summary_en"] = summary_en;
            if (summary_hi !== undefined) update["llm_analysis.summary_hi"] = summary_hi;

            if (Object.keys(update).length === 0) {
                return res.status(400).json({ error: "No fields to update" });
            }

            const doc = await Call.findOneAndUpdate(
                { call_id: req.params.call_id, userId },
                { $set: update },
                { new: true }
            ).lean();

            if (!doc) return res.status(404).json({ error: "Call not found" });
            res.json({ success: true });
        } catch (err: any) {
            console.error("[Route] PUT /call-bookings error:", err.message);
            res.status(500).json({ error: err.message });
        }
    }
);

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
