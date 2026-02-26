import { Router, Request, Response } from "express";
import { Customer } from "../models/Customer.js";
import { Campaign } from "../models/Campaign.js";
import { buildCampaignCsv } from "../utils/csvBuilder.js";
import * as bolnaService from "../services/bolnaService.js";
import { isAuthenticated, isSubscribed, hasBolnaKey } from "../middleware/auth.js";
import { normalizePhone } from "../utils/phoneUtils.js";

const router = Router();

// GET /api/campaigns — List all campaigns for current user (paginated)
router.get("/", isAuthenticated, isSubscribed, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;

    const [total, campaigns] = await Promise.all([
      Campaign.countDocuments({ userId: user._id }),
      Campaign.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    res.json({
      campaigns,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/campaigns/preview?status=fresh — Preview leads before creating campaign
router.get("/preview", isAuthenticated, isSubscribed, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    if (!status)
      return res
        .status(400)
        .json({ error: "status query param is required" });

    const user = req.user as any;
    const customers = await Customer.find(
      { userId: user._id, status },
      "name phoneNumber status pastConversations"
    );
    res.json({ count: customers.length, customers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/campaigns/download-csv?status=fresh — Download Bolna-format CSV
router.get(
  "/download-csv",
  isAuthenticated,
  isSubscribed,
  async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      if (!status)
        return res
          .status(400)
          .json({ error: "status query param is required" });

      const user = req.user as any;
      const customers = await Customer.find({ userId: user._id, status });
      if (customers.length === 0) {
        return res
          .status(404)
          .json({ error: `No leads found with status: ${status}` });
      }

      const csvBuffer = buildCampaignCsv(customers as any);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="leads_${status}_${Date.now()}.csv"`
      );
      res.send(csvBuffer);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// POST /api/campaigns/create — Auto-build CSV + upload to Bolna
router.post(
  "/create",
  isAuthenticated,
  isSubscribed,
  hasBolnaKey,
  async (req: Request, res: Response) => {
    try {
      console.log("[CampaignCreate] req.body:", req.body);
      const { agentId, targetStatus, campaignName, scheduledAt, fromPhoneNumber } = req.body;
      console.log("[CampaignCreate] Extracted values:", { agentId, targetStatus, campaignName, scheduledAt, fromPhoneNumber });

      if (!agentId || !targetStatus || !campaignName) {
        return res.status(400).json({
          error: "agentId, targetStatus, and campaignName are required",
        });
      }

      const user = req.user as any;
      const customers = await Customer.find({
        userId: user._id,
        status: targetStatus,
      });

      if (customers.length === 0) {
        return res
          .status(404)
          .json({ error: `No leads found with status: ${targetStatus}` });
      }

      // Build Bolna-compliant CSV
      const csvBuffer = buildCampaignCsv(customers as any);
      const filename = `${campaignName.replace(/\s+/g, "_")}_${Date.now()}.csv`;

      console.log(`[CampaignCreate] Submitting batch to Bolna:
        - Lead Count: ${customers.length}
        - From Phone: ${fromPhoneNumber ? normalizePhone(fromPhoneNumber) : "Default"}
        - Agent ID: ${agentId}
      `);

      // Step 1: Upload CSV to Bolna
      const batchResult = await bolnaService.createBatch(
        user,
        agentId,
        csvBuffer,
        filename,
        fromPhoneNumber ? normalizePhone(fromPhoneNumber) : undefined
      );

      if (batchResult.state !== "created" && batchResult.status !== "created") {
        return res
          .status(500)
          .json({
            error: `Bolna batch creation returned unexpected state: ${JSON.stringify(batchResult)}`,
            detail: batchResult,
          });
      }

      // Save campaign to DB as draft
      const campaign = await Campaign.create({
        userId: user._id,
        agentId,
        batchId: batchResult.batch_id || batchResult.id,
        name: campaignName,
        status: "draft",
        targetStatus,
        leadCount: customers.length,
      });

      res.status(201).json({
        success: true,
        campaign,
        batchId: batchResult.batch_id || batchResult.id,
        leadCount: customers.length,
        bolnaState: batchResult,
      });
    } catch (err: any) {
      if (err.response) {
        console.error("Campaign create Bolna error:", err.response.data);
        return res.status(err.response.status).json({
          error: err.response.data.message || err.response.data.detail || "Bolna API Error"
        });
      }
      console.error("Campaign create error:", err);
      // Send the stack trace to the frontend so the Toast shows exactly what line failed
      res.status(500).json({ error: `Backend Crash: ${err.stack || err.message}` });
    }
  }
);

// POST /api/campaigns/:id/schedule — Manually schedule a drafted campaign
router.post(
  "/:id/schedule",
  isAuthenticated,
  isSubscribed,
  hasBolnaKey,
  async (req: Request, res: Response) => {
    try {
      const { scheduledAt } = req.body;
      if (!scheduledAt) {
        return res.status(400).json({ error: "scheduledAt is required" });
      }

      const user = req.user as any;
      const campaign = await Campaign.findOne({
        _id: req.params.id,
        userId: user._id,
      });

      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      if (campaign.status !== "draft") {
        return res.status(400).json({ error: "Only draft campaigns can be manually scheduled." });
      }

      const rawScheduleTime = new Date(scheduledAt);
      rawScheduleTime.setMilliseconds(0);
      const scheduleTime = rawScheduleTime.toISOString().replace("Z", "+00:00");

      const scheduleResult = await bolnaService.scheduleBatch(
        user,
        campaign.batchId!,
        scheduleTime
      );

      campaign.status = "scheduled";
      // Update schedule time
      (campaign as any).scheduledAt = rawScheduleTime;
      await campaign.save();

      res.status(200).json({
        success: true,
        campaign,
        scheduledAt: scheduleTime,
        bolnaState: scheduleResult,
      });
    } catch (err: any) {
      if (err.response) {
        console.error("Campaign schedule Bolna error:", err.response.data);
        return res.status(err.response.status).json({
          error: err.response.data.message || err.response.data.detail || "Bolna API Error"
        });
      }
      console.error("Campaign schedule error:", err);
      res.status(500).json({ error: `Backend Crash: ${err.stack || err.message}` });
    }
  }
);

// POST /api/campaigns/:id/stop — Stop a scheduled/running campaign
router.post(
  "/:id/stop",
  isAuthenticated,
  isSubscribed,
  hasBolnaKey,
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const campaign = await Campaign.findOne({
        _id: req.params.id,
        userId: user._id,
      });

      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      if (!["scheduled", "running"].includes(campaign.status)) {
        return res.status(400).json({
          error: `Cannot stop a campaign with status "${campaign.status}". Only scheduled or running campaigns can be stopped.`,
        });
      }

      if (!campaign.batchId) {
        return res.status(400).json({ error: "Campaign has no associated batch" });
      }

      const stopResult = await bolnaService.stopBatch(user, campaign.batchId);

      campaign.status = "stopped";
      await campaign.save();

      res.status(200).json({
        success: true,
        campaign,
        bolnaState: stopResult,
      });
    } catch (err: any) {
      if (err.response) {
        console.error("Campaign stop Bolna error:", err.response.data);

        // If Bolna rejected, the batch might already be completed/stopped.
        // Force a sync of the remote status and return success if we updated it.
        try {
          const user = req.user as any;
          const campaign = await Campaign.findOne({ _id: req.params.id, userId: user._id });
          if (campaign && campaign.batchId) {
            const bolnaStatus = await bolnaService.getBatchStatus(user, campaign.batchId);
            const statusMap: Record<string, string> = {
              scheduled: "scheduled",
              completed: "completed",
              failed: "failed",
              stopped: "stopped",
            };
            const newStatus = statusMap[bolnaStatus.status];
            if (newStatus && campaign.status !== newStatus) {
              campaign.status = newStatus as any;
              await campaign.save();
            }
            // Return 200 — the campaign status was synced successfully
            return res.status(200).json({
              success: true,
              campaign,
              message: `Campaign status synced from Bolna: ${campaign.status}`,
            });
          }
        } catch (syncErr) {
          console.error("Failed to auto-sync campaign status during stop error:", syncErr);
        }

        // If sync also failed, return the original error
        const errorMessage = err.response.data.message || err.response.data.detail || "Bolna API Error";
        return res.status(err.response.status).json({
          error: `Failed to stop: ${errorMessage}`
        });
      }
      console.error("Campaign stop error:", err);
      res.status(500).json({ error: `Backend Crash: ${err.stack || err.message}` });
    }
  }
);

// GET /api/campaigns/:id/status — Live Bolna batch status
router.get(
  "/:id/status",
  isAuthenticated,
  isSubscribed,
  hasBolnaKey,
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const campaign = await Campaign.findOne({
        _id: req.params.id,
        userId: user._id,
      });
      if (!campaign)
        return res.status(404).json({ error: "Campaign not found" });

      const bolnaStatus = await bolnaService.getBatchStatus(
        user,
        campaign.batchId!
      );

      // Sync status to our DB
      const statusMap: Record<string, string> = {
        scheduled: "scheduled",
        completed: "completed",
        failed: "failed",
        stopped: "stopped",
      };
      if (statusMap[bolnaStatus.status] && campaign.status !== bolnaStatus.status) {
        campaign.status = statusMap[bolnaStatus.status] as any;
        await campaign.save();
      }

      res.json({ campaign, bolnaStatus });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// GET /api/campaigns/:id/results — Call execution results
router.get(
  "/:id/results",
  isAuthenticated,
  isSubscribed,
  hasBolnaKey,
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const campaign = await Campaign.findOne({
        _id: req.params.id,
        userId: user._id,
      });
      if (!campaign)
        return res.status(404).json({ error: "Campaign not found" });

      const executions = await bolnaService.getBatchExecutions(
        user,
        campaign.batchId!
      );
      res.json({ campaign, executions });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
