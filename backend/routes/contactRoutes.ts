import { Router, Request, Response } from "express";
import { Contact } from "../models/Contact.js";
import { Call } from "../models/Call.js";
import { syncCallsForPhone } from "../services/callPoller.js";
import { analyzeTranscript } from "../services/llmService.js";

const router = Router();

// GET /api/contacts - List all contacts with filters
router.get("/", async (req: Request, res: Response) => {
    try {
        const { tag, source, search, limit, skip } = req.query;
        const query: any = {};

        if (tag) query.tag = tag;
        if (source) query.source = source;
        if (search) {
            const searchRegex = new RegExp(search as string, "i");
            query.$or = [{ name: searchRegex }, { phone: searchRegex }, { email: searchRegex }];
        }

        const total = await Contact.countDocuments(query);

        const contacts = await Contact.find(query)
            .sort({ last_call_date: -1, created_at: -1 })
            .limit(Number(limit) || 50)
            .skip(Number(skip) || 0)
            .lean();

        // Check if we need to return call history summary?? NO, list view just needs summaries.
        // The Contact model stores summaries already (via callProcessor updates).

        // Transform _id to id for frontend compatibility?
        const result = contacts.map(c => ({
            ...c,
            id: c._id.toString(), // Frontend expects string ID
        }));

        res.json({
            contacts: result,
            pagination: {
                total,
                page: Math.floor((Number(skip) || 0) / (Number(limit) || 50)) + 1,
                pages: Math.ceil(total / (Number(limit) || 50)),
                limit: Number(limit) || 50
            }
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/contacts/:id/latest-structured-call
router.get("/:id/latest-structured-call", async (req: Request, res: Response) => {
    try {
        const contact = await Contact.findById(req.params.id).lean();
        // If not found by ID, try phone
        const query = contact ? { caller_number: contact.phone } : { caller_number: req.params.id };

        const latestCall = await Call.findOne(query)
            .sort({ call_timestamp: -1 })
            .lean();

        if (!latestCall || !latestCall.llm_analysis) {
            return res.json({ has_structured_data: false, message: "No analyzed calls found" });
        }

        const analysis = latestCall.llm_analysis;

        res.json({
            has_structured_data: true,
            id: latestCall.call_id,
            date: latestCall.call_timestamp,
            intent: analysis.intent,
            summary: analysis.summary,
            structured_data: analysis.booking || {}, // Map booking data as structured data
            sentiment_score: 0, // Placeholder
            success_evaluation: "unknown"
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/contacts/:id - Get single contact + call history
router.get("/:id", async (req: Request, res: Response) => {
    try {
        const contact = await Contact.findById(req.params.id).lean();
        if (!contact) {
            // Try finding by phone if ID is not ObjectId
            const byPhone = await Contact.findOne({ phone: req.params.id }).lean();
            if (byPhone) {
                return res.json({ ...byPhone, id: byPhone._id.toString() });
            }
            return res.status(404).json({ error: "Contact not found" });
        }

        // Fetch call history for this contact's phone
        let calls = await Call.find({ caller_number: contact.phone })
            .sort({ call_timestamp: -1 })
            .lean();

        // If history is empty, try to sync from Bolna on the fly
        if (calls.length === 0) {
            console.log(`[Routes] No history found for ${contact.phone}, syncing from Bolna...`);
            try {
                const syncedCalls = await syncCallsForPhone(contact.phone);
                console.log(`[Routes] Sync found ${syncedCalls.length} calls for ${contact.phone}`);

                if (syncedCalls.length > 0) {
                    // Save synced calls to DB (without processing them with LLM immediately for speed)
                    for (const call of syncedCalls) {
                        await Call.updateOne(
                            { call_id: call.call_id },
                            { $set: { ...call, created_at: new Date(call.call_timestamp) }, $setOnInsert: { processed: false } },
                            { upsert: true }
                        );
                    }
                    // Fetch again
                    calls = await Call.find({ caller_number: contact.phone })
                        .sort({ call_timestamp: -1 })
                        .lean();
                }
            } catch (err: any) {
                console.error(`[Routes] Sync failed for ${contact.phone}:`, err.message);
            }
        }

        // Transform calls to frontend format (CallHistoryItem)
        const callHistory = calls.map(call => ({
            id: call.call_id,
            date: call.call_timestamp,
            duration: call.call_duration,
            status: call.processed ? "completed" : "failed", // simple logic
            type: call.call_direction,
            intent: call.llm_analysis?.intent,
            summary: call.llm_analysis?.summary || call.transcript, // Fallback to transcript if no summary
            transcript: call.transcript,
            recording_url: call.recording_url || "",
            agent_name: call.agent_name || call.agent_id,
            cost: call.total_cost || 0,
            cost_breakdown: call.cost_breakdown || null,
            extracted_data: call.extracted_data || null
        }));

        res.json({
            ...contact,
            id: contact._id.toString(),
            call_history: callHistory
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/contacts - Create contact
router.post("/", async (req: Request, res: Response) => {
    try {
        const newContact = new Contact(req.body);
        const saved = await newContact.save();
        res.json({ ...saved.toObject(), id: saved._id.toString() });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/contacts/:id - Update contact
router.put("/:id", async (req: Request, res: Response) => {
    try {
        const updated = await Contact.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updated_at: new Date() },
            { new: true }
        ).lean();
        if (!updated) return res.status(404).json({ error: "Contact not found" });
        res.json({ ...updated, id: updated._id.toString() });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/contacts/:id - Delete contact
router.delete("/:id", async (req: Request, res: Response) => {
    try {
        await Contact.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
