/**
 * Razorpay Webhook — production-safe payment confirmation.
 * CRITICAL: Must receive raw body (not JSON-parsed) for signature verification.
 * Register BEFORE express.json() in server/index.ts using express.raw()
 */
import { Router, Request, Response } from "express";
import crypto from "crypto";
import { Payment } from "../models/Payment.js";
import { activateSubscription } from "./subscriptionRoutes.js";

const router = Router();

router.post("/razorpay", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-razorpay-signature"] as string;
    const body = req.body; // raw Buffer (from express.raw())

    const expectedSig = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSig !== signature) {
      console.warn("[Webhook] Invalid signature");
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    const event = JSON.parse(body.toString());

    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;

      // Find the pending payment record to get userId
      const paymentRecord = await Payment.findOne({ razorpayOrderId: orderId });
      if (!paymentRecord) {
        console.warn(`[Webhook] No payment record for order ${orderId}`);
        return res.status(200).json({ received: true }); // acknowledge to avoid retries
      }

      await activateSubscription(
        paymentRecord.userId.toString(),
        orderId,
        paymentId
      );
      console.log(`[Webhook] Subscription activated for user ${paymentRecord.userId}`);
    }

    res.status(200).json({ received: true });
  } catch (err: any) {
    console.error("[Webhook] Error:", err.message);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
