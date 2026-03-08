import mongoose from "mongoose";
import { Coupon } from "../models/Coupon";
import dotenv from "dotenv";

dotenv.config();

const seedCoupon = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI not found in environment");
    }

    await mongoose.connect(mongoUri);
    console.log("✓ Connected to MongoDB");

    const couponCode = process.env.COUPON_CODE_30DAY;
    if (!couponCode) {
      throw new Error("COUPON_CODE_30DAY not found in environment");
    }

    // Upsert: update if exists, create if doesn't
    const result = await Coupon.findOneAndUpdate(
      { code: couponCode.toUpperCase() },
      {
        code: couponCode.toUpperCase(),
        trialDays: 30,
        isActive: true,
      },
      { upsert: true, returnDocument: "after" }
    );

    console.log(
      `✓ Coupon seeded successfully: ${result.code} (${result.trialDays} days)`
    );
    process.exit(0);
  } catch (error) {
    console.error("✗ Error seeding coupon:", error);
    process.exit(1);
  }
};

seedCoupon();
