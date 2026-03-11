import { Router, Request, Response, NextFunction } from "express";
import { Customer } from "../models/Customer.js";
import { Call } from "../models/Call.js";
import { isAuthenticated, isSubscribed } from "../middleware/auth.js";
import { attachTenantContext } from "../middleware/tenantContext.js";
import { runSyncPoller } from "../services/syncPoller.js";
import { generalLimiter } from "../middleware/rateLimiter.js";
import multer from "multer";
import { parse } from "csv-parse/sync";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const router = Router();

// Apply tenant context at the router level so this file is self-sufficient.
// Even if the parent server.ts forgets to apply tenantScoped, all CRM routes
// still get req.tenantId set correctly from the authenticated session.
router.use(isAuthenticated, attachTenantContext);

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

// POST /api/crm/sync-bolna — Manually trigger the background sync poller
router.post("/sync-bolna", isAuthenticated, isSubscribed, async (req: Request, res: Response) => {
  try {
    // Run poller async — respond immediately so the UI doesn't hang
    runSyncPoller().catch(err =>
      console.error("[CrmRoutes] Manual sync poller error:", err)
    );
    res.json({
      success: true,
      message: "Sync started in background — data will update within a minute",
    });
  } catch (err: any) {
    console.error("[CrmRoutes] Sync trigger error:", err.message);
    res.status(500).json({ message: "Failed to sync with Bolna", error: err.message });
  }
});

// GET /api/crm — Paginated List with Filters
router.get("/", isAuthenticated, isSubscribed, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const skip = (page - 1) * limit;

    const user = req.user as any;
    const filter: any = { userId: req.tenantId };

    const allowedStatuses = ["fresh", "interested", "not_interested", "booked", "NA", "queries", "follow_up", "sent_quotation"];
    if (req.query.status && allowedStatuses.includes(req.query.status as string)) {
      filter.status = req.query.status;
    }

    if (req.query.direction === "inbound" || req.query.direction === "outbound") {
      filter.callDirections = req.query.direction;
    }

    if (req.query.search) {
      const searchRegex = new RegExp((req.query.search as string).trim(), "i");
      filter.$or = [{ name: searchRegex }, { phoneNumber: searchRegex }];
    }

    const [total, customers] = await Promise.all([
      Customer.countDocuments(filter),
      Customer.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("name phoneNumber email status createdAt updatedAt pastConversations callDirections"),
    ]);

    // Enrich customers with data from latest processed Call (same source as /bookings).
    // For customers with empty pastConversations or generic names, pull from Call.llm_analysis.
    const phoneNumbers = customers.map((c) => c.phoneNumber);
    const latestCallsRaw = await Call.aggregate([
      {
        $match: {
          userId: req.tenantId,
          caller_number: { $in: phoneNumbers },
          processed: true,
          llm_analysis: { $ne: null },
        },
      },
      { $sort: { call_timestamp: -1 } },
      {
        $group: {
          _id: "$caller_number",
          latestCall: { $first: "$$ROOT" },
        },
      },
    ]);

    const callByPhone = new Map<string, any>();
    latestCallsRaw.forEach(({ _id, latestCall }: any) =>
      callByPhone.set(_id, latestCall)
    );

    // Same intent→status mapping as syncPoller Phase 3
    const intentToStatus: Record<string, string> = {
      booked: "booked",
      interested: "interested",
      not_interested: "not_interested",
      follow_up: "follow_up",
      queries: "queries",
    };

    const backfillOps: Promise<any>[] = [];

    const enriched = customers.map((c) => {
      const obj = c.toObject();
      const call = callByPhone.get(c.phoneNumber);
      if (!call) return obj;

      const dbUpdate: any = {};

      // 1. Replace generic name with LLM-extracted real name + queue DB write (fixes search)
      if (/^Contact \d+$/.test(obj.name) && call.llm_analysis?.customer_name) {
        obj.name = call.llm_analysis.customer_name;
        dbUpdate.name = obj.name;
      }

      // 2. Update status from LLM intent of the LATEST call.
      //    Always overwrite so repeat callers who change their mind are reflected correctly.
      //    intentToStatus only maps LLM-derived intents — manually-set statuses like
      //    "sent_quotation" that aren't in the map are never touched by enrichment.
      const mappedStatus = intentToStatus[call.llm_analysis?.intent] as import("../models/Customer.js").CustomerStatus | undefined;
      if (mappedStatus) {
        obj.status = mappedStatus;
        dbUpdate.status = mappedStatus;
      }

      // 3. Fill empty pastConversations (in-memory only, NOT persisted — modal uses /calls endpoint)
      if (obj.pastConversations.length === 0) {
        obj.pastConversations = [
          {
            date: call.call_timestamp || call.created_at,
            summary: call.llm_analysis.summary || "",
            summary_en: call.llm_analysis.summary_en || "",
            summary_hi: call.llm_analysis.summary_hi || "",
            next_step: call.llm_analysis.next_step || "",
            sentiment: call.llm_analysis.sentiment || "",
            notes: call.transcript || "",
          },
        ];
      }

      // Queue background DB write for name + status (fire-and-forget)
      if (Object.keys(dbUpdate).length > 0) {
        backfillOps.push(
          Customer.updateOne(
            { _id: c._id, userId: req.tenantId },
            { $set: dbUpdate }
          )
        );
      }

      return obj;
    });

    // Fire-and-forget — persists real name + status so search works on next load
    if (backfillOps.length > 0) {
      Promise.all(backfillOps).catch((err) =>
        console.error("[CrmRoutes] Backfill error:", err.message)
      );
    }

    res.json({
      customers: enriched,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to fetch customers", error: err.message });
  }
});

// GET /api/crm/stats — status breakdown counts
router.get("/stats", isAuthenticated, isSubscribed, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const stats = await Customer.aggregate([
      { $match: { userId: req.tenantId, isDeleted: false } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const result: Record<string, number> = {
      fresh: 0,
      interested: 0,
      not_interested: 0,
      booked: 0,
      NA: 0,
      queries: 0,
      follow_up: 0,
      sent_quotation: 0,
    };
    stats.forEach((s: any) => {
      if (s._id in result) result[s._id] = s.count;
    });
    result.total = Object.values(result).reduce((a, b) => a + b, 0);

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/crm — create customer
router.post(
  "/",
  isAuthenticated,
  isSubscribed,
  generalLimiter,
  async (req: Request, res: Response) => {
    try {
      const { name, phoneNumber, email, status, callDirections } = req.body;
      if (!name || !phoneNumber) {
        return res.status(400).json({ message: "Name and phone number are required" });
      }

      // Validate phone format: must start with + and country code
      const phoneRegex = /^\+[1-9]\d{6,14}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({
          message: "Invalid phone number. Use international format: +91XXXXXXXXXX",
        });
      }

      const user = req.user as any;
      const customer = await Customer.create({
        userId: req.tenantId,
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        email: (email || "").trim(),
        status: status || "fresh",
        callDirections: callDirections || [],
      });
      res.status(201).json({ message: "Lead added successfully", customer });
    } catch (err: any) {
      if (err.code === 11000) {
        return res.status(409).json({ message: "This phone number already exists in your CRM" });
      }
      res.status(500).json({ message: "Failed to add lead", error: err.message });
    }
  }
);

// POST /api/crm/bulk — Bulk CSV Upload
router.post(
  "/bulk",
  isAuthenticated,
  isSubscribed,
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

      const rawRecords = parse(mReq.file.buffer.toString(), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      const processed: any[] = [];
      const errors: any[] = [];

      // Full normalizer — handles scientific notation, leading zeros, hyphens, 12-digit, etc.
      const normalizePhone = (raw: string): string | null => {
        let val = String(raw ?? "").trim();
        if (!val) return null;
        // Excel scientific notation (e.g. 9.17471E+11 → 917471000000)
        if (/[eE]/.test(val) && /^\d/.test(val)) {
          const num = Number(val);
          if (!isNaN(num) && isFinite(num)) val = Math.round(num).toString();
        }
        // Strip hyphens, spaces, dots, parentheses
        val = val.replace(/[\s\-\.\(\)]/g, "");
        // Already correct Indian E.164 (+91XXXXXXXXXX starting 6-9)
        if (/^\+91[6-9]\d{9}$/.test(val)) return val;
        // Valid non-Indian E.164 (+1…, +44…, etc.)
        if (/^\+[1-9]\d{6,14}$/.test(val) && !val.startsWith("+91")) return val;
        // Has +91 prefix — check length and start digit
        if (val.startsWith("+91")) {
          const d = val.slice(3);
          if (d.length === 10 && /^[6-9]/.test(d)) return "+91" + d;
          return null;
        }
        // 12 digits: 91XXXXXXXXXX (no +)
        if (/^91\d{10}$/.test(val)) {
          const d = val.slice(2);
          return /^[6-9]/.test(d) ? "+91" + d : null;
        }
        // 10-digit Indian number (no prefix)
        if (/^\d{10}$/.test(val)) {
          return /^[6-9]/.test(val) ? "+91" + val : null;
        }
        // Leading zero: 09876543210
        if (/^0\d{10}$/.test(val)) {
          const s = val.slice(1);
          return /^[6-9]/.test(s) ? "+91" + s : null;
        }
        return null;
      };

      const VALID_STATUSES = ["fresh", "interested", "not_interested", "booked", "NA", "queries"];

      for (const row of rawRecords) {
        // Accept any common phone column header
        const rawPhone = (row.phoneNumber || row.phone || row.mobile || row.contact || row.mob || "").trim();
        const phone = normalizePhone(rawPhone);

        if (!phone) {
          errors.push({ row: row.name || rawPhone || "Unknown", reason: `Invalid phone: "${rawPhone}"` });
          continue;
        }

        if (!row.name?.trim()) {
          errors.push({ row: phone, reason: "Missing name" });
          continue;
        }

        const status = VALID_STATUSES.includes(row.status) ? row.status : "fresh";

        processed.push({
          userId: req.tenantId,
          name: row.name.trim(),
          phoneNumber: phone,
          email: (row.email || "").trim().toLowerCase(),
          status,
        });
      }

      // Remove duplicates within the uploaded CSV itself
      const seen = new Set();
      const deduplicated = processed.filter((r) => {
        if (seen.has(r.phoneNumber)) return false;
        seen.add(r.phoneNumber);
        return true;
      });

      let insertedCount = 0;
      let skippedCount = 0;

      if (!req.tenantId) {
        console.error("[CrmRoutes] Missing tenantId in bulk upload request");
        return res.status(401).json({ message: "Tenant context missing — please re-login" });
      }

      if (deduplicated.length > 0) {
        try {
          const result = await Customer.insertMany(deduplicated, { ordered: false });
          insertedCount = result.length;
        } catch (bulkErr: any) {
          // Handle partial successes/failures from insertMany (e.g. 11000 duplicate keys)
          if (bulkErr.name === "BulkWriteError" || bulkErr.code === 11000 || bulkErr.writeErrors) {
            insertedCount = bulkErr.result?.nInserted || 0;
            skippedCount = deduplicated.length - insertedCount;
            console.log(`[CrmRoutes] Bulk upload partial success: ${insertedCount} inserted, ${skippedCount} skipped`);
          } else {
            console.error("[CrmRoutes] Critical Bulk upload error:", bulkErr);
            throw bulkErr;
          }
        }
      }

      res.json({
        message: deduplicated.length === 0 ? "No valid leads found in CSV" : "Bulk upload complete",
        inserted: insertedCount, // Keep both for safety
        skipped: skippedCount,
        insertedCount, // Match frontend expectation
        skippedCount,
        validationErrors: errors,
      });
    } catch (err: any) {
      console.error("[CrmRoutes] 500 Bulk upload failure:", err);
      res.status(500).json({
        message: "Bulk upload failed on server",
        error: err.message,
        details: process.env.NODE_ENV === "development" ? err.stack : undefined
      });
    }
  }
);

// POST /api/crm/bulk-json — Phase 7: accept pre-normalized rows from the frontend
// The frontend has already validated + normalized all phone numbers to E.164.
// This endpoint simply inserts them and handles DB-level duplicates.
router.post("/bulk-json", isAuthenticated, isSubscribed, async (req: Request, res: Response) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: "No rows provided" });
    }

    const VALID_STATUSES = ["fresh", "interested", "not_interested", "booked", "NA", "queries"];

    const docs = rows
      .map((r: any) => ({
        userId: req.tenantId,
        name: String(r.name || "").trim(),
        phoneNumber: String(r.phoneNumber || "").trim(),
        email: String(r.email || "").trim().toLowerCase(),
        status: VALID_STATUSES.includes(r.status) ? r.status : "fresh",
      }))
      .filter(d => d.name && d.phoneNumber);

    if (docs.length === 0) {
      return res.status(400).json({ message: "No valid rows after filtering" });
    }

    let insertedCount = 0;
    let skippedCount  = 0;

    try {
      const result = await Customer.insertMany(docs, { ordered: false });
      insertedCount = result.length;
    } catch (bulkErr: any) {
      if (bulkErr.code === 11000 || bulkErr.writeErrors) {
        insertedCount = bulkErr.result?.nInserted ?? 0;
        skippedCount  = docs.length - insertedCount;
      } else {
        throw bulkErr;
      }
    }

    res.json({ inserted: insertedCount, skipped: skippedCount });
  } catch (err: any) {
    console.error("[CrmRoutes] bulk-json error:", err.message);
    res.status(500).json({ message: err.message || "Bulk import failed" });
  }
});

// GET /api/crm/:id/calls — All LLM-processed calls for a customer (by phone number)
// Used by ContactDetailModal to show full call history + transcripts
router.get("/:id/calls", isAuthenticated, isSubscribed, async (req: Request, res: Response) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      userId: req.tenantId,
    }).select("phoneNumber");

    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const calls = await Call.find({
      userId: req.tenantId,
      caller_number: customer.phoneNumber,
      processed: true,
      llm_analysis: { $ne: null },
    })
      .sort({ call_timestamp: -1 })
      .select(
        "call_id call_timestamp call_direction call_duration transcript llm_analysis recording_url agent_name"
      )
      .lean();

    res.json({ calls });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to fetch call history", error: err.message });
  }
});

// PUT /api/crm/:id — update lead
router.put("/:id", isAuthenticated, isSubscribed, async (req: Request, res: Response) => {
  try {
    const { name, phoneNumber, email, status, conversationNote, callDirections } = req.body;
    const user = req.user as any;

    // Validate phone if being changed
    if (phoneNumber) {
      const phoneRegex = /^\+[1-9]\d{6,14}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({ message: "Invalid phone number format" });
      }
    }

    const update: any = {};
    if (name !== undefined) update.name = name.trim();
    if (phoneNumber !== undefined) update.phoneNumber = phoneNumber.trim();
    if (email !== undefined) update.email = email.trim();
    if (status !== undefined) update.status = status;
    if (callDirections !== undefined) update.callDirections = callDirections;
    update.updatedAt = new Date();

    if (conversationNote) {
      update.$push = {
        pastConversations: {
          date: new Date(),
          summary: conversationNote.summary || "",
          notes: conversationNote.notes || "",
        },
      };
    }

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, userId: req.tenantId },
      update,
      { new: true, runValidators: true }
    );

    if (!customer) return res.status(404).json({ message: "Lead not found" });
    res.json({ message: "Lead updated", customer });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "This phone number is already in your CRM" });
    }
    res.status(500).json({ message: "Failed to update lead", error: err.message });
  }
});

// DELETE /api/crm/:id — Hard delete a customer
router.delete("/:id", isAuthenticated, isSubscribed, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const deleted = await Customer.findOneAndDelete(
      { _id: req.params.id, userId: req.tenantId }
    );

    if (!deleted) return res.status(404).json({ message: "Lead not found" });
    res.json({ message: "Lead removed" });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to remove lead", error: err.message });
  }
});

export default router;
