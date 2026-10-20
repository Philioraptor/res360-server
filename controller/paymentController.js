import crypto from "crypto";
import Payment from "../models/Payment.js";
import License from "../models/License.js";
import User from "../models/User.js";
import { generateEncryptedLicenseKey, PLAN_CONFIG } from "./licenseController.js";

// =========================================================================
// 1. CREATE PAYMENT ORDER (Simulates gateway order creation e.g. Razorpay / Stripe)
//    URL: POST /api/payment/create-order
// =========================================================================
export const createPaymentOrder = async (req, res) => {
  try {
    const { name, email, planId = "yearly", currency = "USD" } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Customer name and email are required to initiate payment.",
      });
    }

    const planInfo = PLAN_CONFIG[planId] || PLAN_CONFIG.monthly;
    const orderId = `ORDER_${Date.now()}_${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const transactionId = `TXN_${Date.now()}_${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    const payment = await Payment.create({
      orderId,
      transactionId,
      customerName: name.trim(),
      customerEmail: email.trim().toLowerCase(),
      planId,
      planName: planInfo.planName,
      amount: planInfo.price,
      currency,
      status: "created",
    });

    res.status(201).json({
      success: true,
      message: "Payment order initiated successfully.",
      data: {
        orderId: payment.orderId,
        transactionId: payment.transactionId,
        amount: payment.amount,
        currency: payment.currency,
        planName: payment.planName,
        planId: payment.planId,
        customerName: payment.customerName,
        customerEmail: payment.customerEmail,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create payment order.",
    });
  }
};

// =========================================================================
// 2. VERIFY PAYMENT (Supports Success & Failure simulation)
//    URL: POST /api/payment/verify
// =========================================================================
export const verifyPayment = async (req, res) => {
  try {
    const {
      orderId,
      transactionId,
      status = "SUCCESS", // "SUCCESS" or "FAILED"
      failureReason = "Bank declined transaction or insufficient balance",
      paymentMethod = "card",
    } = req.body;

    if (!orderId && !transactionId) {
      return res.status(400).json({
        success: false,
        message: "Order ID or Transaction ID is required for verification.",
      });
    }

    let payment = await Payment.findOne({
      $or: [{ orderId }, { transactionId }],
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment order not found.",
      });
    }

    // Handle Payment Failure simulation
    if (status.toUpperCase() === "FAILED" || status.toUpperCase() === "REJECTED") {
      payment.status = "failed";
      payment.failureReason = failureReason;
      payment.paymentMethod = paymentMethod;
      await payment.save();

      return res.status(400).json({
        success: false,
        paymentStatus: "failed",
        code: "PAYMENT_DECLINED",
        message: `Payment Failed: ${failureReason}. No license code issued.`,
        data: {
          orderId: payment.orderId,
          transactionId: payment.transactionId,
          status: "failed",
          failureReason,
        },
      });
    }

    // Handle Payment Success
    if (payment.status === "completed" && payment.licenseKey) {
      return res.json({
        success: true,
        message: "Payment was already completed.",
        data: {
          orderId: payment.orderId,
          transactionId: payment.transactionId,
          licenseKey: payment.licenseKey,
          planName: payment.planName,
          amount: payment.amount,
          status: "completed",
        },
      });
    }

    const planInfo = PLAN_CONFIG[payment.planId] || PLAN_CONFIG.monthly;
    const licenseKey = generateEncryptedLicenseKey(payment.planId);

    // Create License voucher in DB
    const license = await License.create({
      licenseKey,
      plan: payment.planId,
      planName: planInfo.planName,
      durationDays: planInfo.durationDays,
      pricePaid: payment.amount,
      currency: payment.currency,
      status: "unused",
      purchasedByEmail: payment.customerEmail,
      purchasedByName: payment.customerName,
      paymentId: payment.transactionId,
    });

    payment.status = "completed";
    payment.paymentMethod = paymentMethod;
    payment.licenseKey = licenseKey;
    await payment.save();

    res.status(200).json({
      success: true,
      paymentStatus: "completed",
      message: "Payment verified successfully! Encrypted license key generated.",
      data: {
        orderId: payment.orderId,
        transactionId: payment.transactionId,
        paymentMethod: payment.paymentMethod,
        licenseKey: license.licenseKey,
        plan: license.plan,
        planName: license.planName,
        durationDays: license.durationDays,
        amount: payment.amount,
        currency: payment.currency,
        customerName: payment.customerName,
        customerEmail: payment.customerEmail,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Payment verification failed.",
    });
  }
};

// =========================================================================
// 3. REFUND PAYMENT & REVOKE LICENSE
//    URL: POST /api/payment/refund
// =========================================================================
export const refundPayment = async (req, res) => {
  try {
    const { transactionId, orderId, reason = "Customer requested refund" } = req.body;

    const payment = await Payment.findOne({
      $or: [{ transactionId }, { orderId }],
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found.",
      });
    }

    if (payment.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: `Cannot refund payment with status: ${payment.status}.`,
      });
    }

    // Mark payment refunded
    payment.status = "refunded";
    payment.refundReason = reason;
    payment.refundedAt = new Date();
    await payment.save();

    // Revoke license key
    if (payment.licenseKey) {
      const license = await License.findOne({ licenseKey: payment.licenseKey });
      if (license) {
        license.status = "expired";
        await license.save();

        // If a user redeemed this key, expire their subscription immediately!
        if (license.redeemedBy) {
          const user = await User.findById(license.redeemedBy);
          if (user) {
            user.subscriptionStatus = "expired";
            user.licenseExpiresAt = new Date();
            await user.save();
          }
        }
      }
    }

    res.json({
      success: true,
      message: "Refund processed successfully. Associated license key and access have been revoked.",
      data: {
        transactionId: payment.transactionId,
        status: "refunded",
        refundReason: payment.refundReason,
        refundedAt: payment.refundedAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Refund processing failed.",
    });
  }
};
