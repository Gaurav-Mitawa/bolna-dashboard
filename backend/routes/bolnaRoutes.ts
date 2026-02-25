import { Router, Request, Response } from "express";
import axios from "axios";
import * as bolnaService from "../services/bolnaService.js";
import { isAuthenticated, isSubscribed, hasBolnaKey } from "../middleware/auth.js";

const router = Router();
const BOLNA_HOST = "https://api.bolna.ai";

// GET /api/bolna/agents — dropdown data for campaign form
router.get(
  "/agents",
  isAuthenticated,
  isSubscribed,
  hasBolnaKey,
  async (req: Request, res: Response) => {
    try {
      const agents = await bolnaService.getAgents(req.user as any);
      res.json({ agents });
    } catch (err: any) {
      console.error("Fetch agents error:", err.message);
      res.status(500).json({ error: "Failed to fetch agents from Bolna" });
    }
  }
);

// GET /api/bolna/phone-numbers — dropdown data for campaign form
router.get(
  "/phone-numbers",
  isAuthenticated,
  isSubscribed,
  hasBolnaKey,
  async (req: Request, res: Response) => {
    try {
      const numbers = await bolnaService.getPhoneNumbers(req.user as any);
      res.json({ numbers });
    } catch (err: any) {
      console.error("Fetch numbers error:", err.message);
      res.status(500).json({ error: "Failed to fetch phone numbers from Bolna", details: err.message });
    }
  }
);

router.get("/test-restart", (req, res) => {
  res.json({ message: "Restarted successfully!" });
});

/**
 * GENERIC PROXY
 * Forwards any request to api.bolna.ai attaching the user's API key.
 * Used by bolnaApi.ts on the frontend to avoid direct browser-to-Bolna calls.
 */
router.all(
  "/proxy",
  isAuthenticated,
  isSubscribed,
  hasBolnaKey,
  async (req: Request, res: Response) => {
    try {
      const { method, query, body } = req;
      const endpoint = query.endpoint as string;

      if (!endpoint) {
        return res.status(400).json({ error: "Missing endpoint parameter" });
      }

      const apiKey = bolnaService.getApiKey(req.user as any);

      // Construct Bolna URL
      const url = `${BOLNA_HOST}${endpoint}`;

      // Remove endpoint from query to avoid double query params if any
      const axiosParams = { ...query };
      delete axiosParams.endpoint;

      console.log(`[BolnaProxy] Forwarding ${method} to ${url}`);

      const response = await axios({
        method,
        url,
        data: body,
        params: axiosParams,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      });

      res.status(response.status).json(response.data);
    } catch (err: any) {
      const status = err.response?.status || 500;
      const data = err.response?.data || { error: err.message };

      console.error(`[BolnaProxy] Error ${status}:`, data);
      res.status(status).json(data);
    }
  }
);

export default router;
