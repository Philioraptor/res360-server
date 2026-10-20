import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },

    transactionId: {
      type: String,
      required: true,
      unique: true,
    },

    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    customerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    planId: {
      type: String,
      required: true,
      enum: ["monthly", "yearly", "custom", "trial"],
    },

    planName: {
      type: String,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "USD",
    },

    paymentMethod: {
      type: String,
      default: "card",
    },

    status: {
      type: String,
      enum: ["created", "pending", "completed", "failed", "refunded"],
      default: "created",
    },

    failureReason: {
      type: String,
      default: null,
    },

    licenseKey: {
      type: String,
      default: null,
    },

    refundReason: {
      type: String,
      default: null,
    },

    refundedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ customerEmail: 1 });
paymentSchema.index({ status: 1 });

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
