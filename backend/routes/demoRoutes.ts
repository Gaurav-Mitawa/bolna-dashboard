/**
 * Demo Routes — Public endpoints for landing page demo calls
 * Uses environment variables for Bolna agent configuration
 */
import { Router, Request, Response } from "express";
import axios from "axios";

const router = Router();
const BOLNA_HOST = "https://api.bolna.ai";

// Demo call endpoint - triggers Bolna voice agent call
router.post("/call", async (req: Request, res: Response) => {
  try {
    const { phone_number } = req.body;

    if (!phone_number) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    // Validate phone number format (E.164)
    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    if (!phoneRegex.test(phone_number)) {
      return res.status(400).json({ 
        error: "Invalid phone number format. Please include country code (e.g., +919876543210)" 
      });
    }

    // Get demo agent configuration from environment
    const demoAgentId = process.env.DEMO_AGENT_ID;
    const demoApiKey = process.env.DEMO_BOLNA_API_KEY || process.env.BOLNA_API_KEY;
    const demoFromNumber = process.env.DEMO_FROM_PHONE_NUMBER;

    if (!demoAgentId || !demoApiKey) {
      console.error("[DemoRoutes] Missing DEMO_AGENT_ID or DEMO_BOLNA_API_KEY");
      return res.status(503).json({ 
        error: "Demo service is not configured. Please contact support." 
      });
    }

    // Prepare Bolna API request
    const payload: any = {
      agent_id: demoAgentId,
      recipient_phone_number: phone_number,
    };

    // Add from_phone_number if configured
    if (demoFromNumber) {
      payload.from_phone_number = demoFromNumber;
    }

    console.log("[DemoRoutes] Initiating demo call:", {
      agent_id: demoAgentId,
      recipient: phone_number.substring(0, 6) + "****", // Mask for logs
    });

    // Call Bolna API
    const response = await axios.post(`${BOLNA_HOST}/call`, payload, {
      headers: {
        Authorization: `Bearer ${demoApiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });

    console.log("[DemoRoutes] Bolna response:", response.data);

    res.json({
      success: true,
      message: "Demo call initiated successfully",
      execution_id: response.data.execution_id,
      status: response.data.status,
    });

  } catch (err: any) {
    console.error("[DemoRoutes] Error initiating demo call:", {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });

    if (err.response?.status === 401) {
      return res.status(503).json({ error: "Demo service authentication failed" });
    }

    if (err.response?.status === 400) {
      return res.status(400).json({ 
        error: err.response?.data?.message || "Invalid request to voice service" 
      });
    }

    res.status(500).json({ 
      error: "Failed to initiate demo call. Please try again later." 
    });
  }
});

export default router;
