import { Router, Request, Response, NextFunction } from "express";
import { Customer } from "../models/Customer.js";
import { isAuthenticated, isSubscribed } from "../middleware/auth.js";
import { syncBolnaToCrm } from "../services/crmSyncService.js";
import { generalLimiter } from "../middleware/rateLimiter.js";
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

// POST /api/crm/sync-bolna — Manually trigger Bolna execution sync
router.post("/sync-bolna", isAuthenticated, isSubscribed, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const results = await syncBolnaToCrm(user);
    res.json({
      success: true,
      message: "Sync completed",
      data: results
    });
  } catch (err: any) {
    console.error("[CrmRoutes] Sync Bolna Error:", err.message);
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
    const filter: any = { userId: user._id };

    const allowedStatuses = ["fresh", "interested", "not_interested", "booked", "NA", "queries"];
    if (req.query.status && allowedStatuses.includes(req.query.status as string)) {
      filter.status = req.query.status;
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
        .select("name phoneNumber email status createdAt updatedAt pastConversations"),
    ]);

    res.json({
      customers,
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
      { $match: { userId: user._id, isDeleted: false } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const result: Record<string, number> = {
      fresh: 0,
      interested: 0,
      not_interested: 0,
      booked: 0,
      NA: 0,
      queries: 0,
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
      const { name, phoneNumber, email, status } = req.body;
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
        userId: user._id,
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        email: (email || "").trim(),
        status: status || "fresh",
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

      const phoneRegex = /^\+[1-9]\d{6,14}$/;
      const processed: any[] = [];
      const errors: any[] = [];
      const user = req.user as any;

      for (const row of rawRecords) {
        let phone = (row.phoneNumber || row.phone || "").trim();

        // Auto-add +91 if number is 10 digits (Indian numbers)
        if (/^\d{10}$/.test(phone)) phone = "+91" + phone;

        if (!phone || !phoneRegex.test(phone)) {
          errors.push({ row: row.name || "Unknown", reason: "Invalid phone number" });
          continue;
        }

        if (!row.name?.trim()) {
          errors.push({ row: phone, reason: "Missing name" });
          continue;
        }

        processed.push({
          userId: user._id,
          name: row.name.trim(),
          phoneNumber: phone,
          email: (row.email || "").trim(),
          status: "fresh",
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

      try {
        const result = await Customer.insertMany(deduplicated, { ordered: false });
        insertedCount = result.length;
      } catch (bulkErr: any) {
        if (bulkErr.name === "BulkWriteError" || bulkErr.code === 11000 || bulkErr.writeErrors) {
          insertedCount = bulkErr.result?.nInserted || 0;
          skippedCount = (bulkErr.writeErrors?.length || 0) + (deduplicated.length - (bulkErr.result?.nInserted || 0) - (bulkErr.writeErrors?.length || 0));
          // Adjust skipped count: total deduplicated - inserted
          skippedCount = deduplicated.length - insertedCount;
        } else {
          throw bulkErr;
        }
      }

      res.json({
        message: "Bulk upload complete",
        inserted: insertedCount,
        skipped: skippedCount,
        validationErrors: errors,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Bulk upload failed" });
    }
  }
);

// PUT /api/crm/:id — update lead
router.put("/:id", isAuthenticated, isSubscribed, async (req: Request, res: Response) => {
  try {
    const { name, phoneNumber, email, status, conversationNote } = req.body;
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
      { _id: req.params.id, userId: user._id },
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
      { _id: req.params.id, userId: user._id }
    );

    if (!deleted) return res.status(404).json({ message: "Lead not found" });
    res.json({ message: "Lead removed" });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to remove lead", error: err.message });
  }
});

export default router;
