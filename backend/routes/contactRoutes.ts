import { Router, Request, Response, NextFunction } from "express";
import { Contact } from "../models/Contact.js";
import { Call } from "../models/Call.js";
import { isAuthenticated } from "../middleware/auth.js";
import { attachTenantContext } from "../middleware/tenantContext.js";
import multer from "multer";
import { parse } from "csv-parse/sync";

interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

const router = Router();

// Configure multer for bulk upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        if (file.mimetype !== "text/csv" && !file.originalname.endsWith(".csv")) {
            return cb(new Error("Only CSV files are allowed"));
        }
        cb(null, true);
    },
});

// Apply authentication + tenant context to all routes — self-sufficient regardless of server.ts mounting
router.use(isAuthenticated, attachTenantContext);

// GET /api/contacts - List all contacts with filters
router.get("/", async (req: Request, res: Response) => {
    try {
        const userId = req.tenantId;
        const { tag, source, search, limit, skip } = req.query;
        const query: any = { userId }; // Always scope by userId

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

        const result = contacts.map(c => ({
            ...c,
            id: c._id.toString(),
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
        const userId = req.tenantId;
        const contact = await Contact.findOne({ _id: req.params.id, userId }).lean();
        const query = contact ? { caller_number: contact.phone, userId } : { caller_number: req.params.id, userId };

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
            structured_data: analysis.booking || {},
            sentiment_score: 0,
            success_evaluation: "unknown"
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/contacts/:id - Get single contact + call history
router.get("/:id", async (req: Request, res: Response) => {
    try {
        const userId = req.tenantId;
        let contact = await Contact.findOne({ _id: req.params.id, userId }).lean();
        if (!contact) {
            const byPhone = await Contact.findOne({ phone: req.params.id, userId }).lean();
            if (byPhone) {
                contact = byPhone;
            } else {
                return res.status(404).json({ error: "Contact not found" });
            }
        }

        // Call history read from MongoDB only (Phase 10 — poller syncs calls to DB)
        const calls = await Call.find({ caller_number: contact.phone, userId })
            .sort({ call_timestamp: -1 })
            .lean();

        const callHistory = calls.map(call => ({
            id: call.call_id,
            date: call.call_timestamp,
            duration: call.call_duration,
            status: call.processed ? "completed" : "failed",
            type: call.call_direction,
            intent: call.llm_analysis?.intent,
            summary: call.llm_analysis?.summary || call.transcript,
            summary_en: call.llm_analysis?.summary_en,
            summary_hi: call.llm_analysis?.summary_hi,
            next_step: call.llm_analysis?.next_step,
            sentiment: call.llm_analysis?.sentiment,
            transcript: call.transcript,
            recording_url: call.recording_url || "",
            agent_name: call.agent_name || call.agent_id,
            cost: call.total_cost || 0,
            cost_breakdown: call.cost_breakdown || null,
            extracted_data: call.extracted_data || null
        }));

        res.json({
            ...contact,
            id: (contact as any)._id.toString(),
            call_history: callHistory
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/contacts - Create contact
router.post("/", async (req: Request, res: Response) => {
    try {
        const userId = req.tenantId;
        const newContact = new Contact({ ...req.body, userId });
        const saved = await newContact.save();
        res.json({ ...saved.toObject(), id: saved._id.toString() });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/contacts/:id - Update contact
router.put("/:id", async (req: Request, res: Response) => {
    try {
        const userId = req.tenantId;
        const updated = await Contact.findOneAndUpdate(
            { _id: req.params.id, userId },
            { ...req.body, updated_at: new Date() },
            { returnDocument: 'after' }
        ).lean();
        if (!updated) return res.status(404).json({ error: "Contact not found" });
        res.json({ ...updated, id: (updated as any)._id.toString() });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/contacts/:id - Delete contact
router.delete("/:id", async (req: Request, res: Response) => {
    try {
        const userId = req.tenantId;
        await Contact.findOneAndDelete({ _id: req.params.id, userId });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/contacts/bulk-upload
 * Handles CSV contact imports
 */
router.post(
    "/bulk-upload",
    (req: Request, res: Response, next: NextFunction) => {
        upload.single("file")(req, res, (err: any) => {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ message: `File upload error: ${err.message}` });
            } else if (err) {
                return res.status(400).json({ message: err.message });
            }
            next();
        });
    },
    async (req: Request, res: Response) => {
        const mReq = req as MulterRequest;
        try {
            if (!mReq.file) return res.status(400).json({ message: "No file uploaded" });
            if (!req.tenantId) {
                return res.status(401).json({ message: "Tenant context missing" });
            }

            const rawRecords = parse(mReq.file.buffer.toString(), {
                columns: true,
                skip_empty_lines: true,
                trim: true,
            });

            const processed: any[] = [];
            const errors: any[] = [];

            for (const row of rawRecords) {
                let name = (row.name || "").trim();
                let phone = (row.phone || row.phoneNumber || "").trim();
                let email = (row.email || "").trim();

                if (!name || !phone) {
                    errors.push({ row: row.username || "Unknown", reason: "Missing name or phone" });
                    continue;
                }

                processed.push({
                    userId: req.tenantId,
                    name,
                    phone,
                    email,
                    tag: row.tag || "fresh",
                    source: row.source || "csv",
                });
            }

            // Remove duplicates within the batch
            const seen = new Set();
            const deduplicated = processed.filter(r => {
                const key = `${r.phone}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });

            let created = 0;
            let skipped = 0;

            if (deduplicated.length > 0) {
                try {
                    const result = await Contact.insertMany(deduplicated, { ordered: false });
                    created = result.length;
                } catch (bulkErr: any) {
                    if (bulkErr.name === "BulkWriteError" || bulkErr.code === 11000) {
                        created = bulkErr.result?.nInserted || 0;
                        skipped = deduplicated.length - created;
                    } else {
                        throw bulkErr;
                    }
                }
            }

            res.json({
                success: true,
                data: {
                    created,
                    skipped,
                    total: deduplicated.length,
                    validationErrors: errors
                }
            });
        } catch (err: any) {
            console.error("[ContactRoutes] Bulk upload failure:", err);
            res.status(500).json({ message: "Bulk upload failed", error: err.message });
        }
    }
);

export default router;
