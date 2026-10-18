import mongoose from "mongoose";

const licenseSchema = new mongoose.Schema(
  {
    licenseKey: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    plan: {
      type: String,
      enum: ["trial", "monthly", "yearly", "custom"],
      default: "monthly",
    },

    planName: {
      type: String,
      default: "Monthly Plan",
    },

    durationDays: {
      type: Number,
      required: true,
      default: 30,
    },

    pricePaid: {
      type: Number,
      default: 49,
    },

    currency: {
      type: String,
      default: "USD",
    },

    paymentId: {
      type: String,
      default: () => "PAY-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "completed",
    },

    status: {
      type: String,
      enum: ["unused", "redeemed", "expired"],
      default: "unused",
    },

    purchasedByEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    purchasedByName: {
      type: String,
      default: "Restaurant Owner",
    },

    redeemedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    redeemedAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const License = mongoose.model("License", licenseSchema);

export default License;
