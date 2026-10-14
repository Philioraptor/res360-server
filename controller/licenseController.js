import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import License from "../models/License.js";

const JWT_SECRET = process.env.JWT_SECRET || "restaurant360_super_secret_jwt_key";

// Helper: Generate formatted 16-character license voucher code (e.g. RES360-A1B2-C3D4-E5F6)
function generateLicenseKey() {
  const segment1 = crypto.randomBytes(2).toString("hex").toUpperCase();
  const segment2 = crypto.randomBytes(2).toString("hex").toUpperCase();
  const segment3 = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `RES360-${segment1}-${segment2}-${segment3}`;
}

// Plan definitions
const PLAN_CONFIG = {
  monthly: {
    planName: "Monthly Plan",
    durationDays: 30,
    price: 49,
  },
  yearly: {
    planName: "Yearly Plan",
    durationDays: 365,
    price: 468, // $39/mo billed yearly
  },
  custom: {
    planName: "Custom Enterprise Plan",
    durationDays: 730,
    price: 999,
  },
  trial: {
    planName: "14-Day Free Trial",
    durationDays: 14,
    price: 0,
  },
};

// ==========================================
// 1. PURCHASE LICENSE (Called by Portfolio site during recharge/checkout)
//    URL: POST /api/license/purchase
// ==========================================
export const purchaseLicense = async (req, res) => {
  try {
    const { email, password, planId = "yearly", name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "User ID / Email and password are required.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = await User.findOne({ email: cleanEmail });

    // Agar user pehle se exist karta hai, verify password
    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Incorrect password for this User ID / Email.",
        });
      }
    } else {
      // Agar user pehli baar purchase kar raha hai, create account
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await User.create({
        name: name ? name.trim() : cleanEmail.split("@")[0],
        email: cleanEmail,
        password: hashedPassword,
        role: "admin",
        subscriptionStatus: "trial",
        subscriptionPlan: "trial",
        licenseExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      });
    }

    const planInfo = PLAN_CONFIG[planId] || PLAN_CONFIG.monthly;
    let licenseKey = generateLicenseKey();

    // Ensure uniqueness
    let existing = await License.findOne({ licenseKey });
    while (existing) {
      licenseKey = generateLicenseKey();
      existing = await License.findOne({ licenseKey });
    }

    const license = await License.create({
      licenseKey,
      plan: planId,
      planName: planInfo.planName,
      durationDays: planInfo.durationDays,
      pricePaid: planInfo.price,
      currency: "USD",
      status: "unused",
      purchasedByEmail: cleanEmail,
      purchasedByName: user.name || "Restaurant Owner",
    });

    res.status(201).json({
      success: true,
      message: "License key generated successfully!",
      data: {
        licenseKey: license.licenseKey,
        plan: license.plan,
        planName: license.planName,
        durationDays: license.durationDays,
        pricePaid: license.pricePaid,
        currency: license.currency,
        paymentId: license.paymentId,
        purchasedByEmail: license.purchasedByEmail,
        createdAt: license.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to purchase license.",
    });
  }
};

// ==========================================
// 2. REDEEM LICENSE (Called by Restaurant Dashboard to apply recharge)
//    URL: POST /api/license/redeem
// ==========================================
export const redeemLicense = async (req, res) => {
  try {
    const { licenseKey } = req.body;

    if (!licenseKey) {
      return res.status(400).json({
        success: false,
        message: "License key is required.",
      });
    }

    // Authenticate user via Bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Please log in to redeem your license key.",
      });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session. Please log in again.",
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const cleanKey = licenseKey.trim().toUpperCase();
    const license = await License.findOne({ licenseKey: cleanKey });

    if (!license) {
      return res.status(404).json({
        success: false,
        message: "Invalid license key. Please check the code and try again.",
      });
    }

    if (license.status === "redeemed") {
      return res.status(400).json({
        success: false,
        message: "This license key has already been redeemed and is no longer valid.",
      });
    }

    if (license.status === "expired") {
      return res.status(400).json({
        success: false,
        message: "This license key has expired.",
      });
    }

    // Calculate new expiration date (Recharge stacking model)
    const now = new Date();
    let baseDate = now;

    // Agar user ka purana plan abhi tak expire nahi hua hai, uske aage extend karo
    if (user.licenseExpiresAt && new Date(user.licenseExpiresAt) > now) {
      baseDate = new Date(user.licenseExpiresAt);
    }

    const newExpiry = new Date(baseDate.getTime() + license.durationDays * 24 * 60 * 60 * 1000);

    // Update user subscription
    user.subscriptionStatus = "active";
    user.subscriptionPlan = license.plan;
    user.licenseKey = license.licenseKey;
    user.licenseExpiresAt = newExpiry;
    user.activatedAt = now;
    await user.save();

    // Mark license as redeemed
    license.status = "redeemed";
    license.redeemedBy = user._id;
    license.redeemedAt = now;
    license.expiresAt = newExpiry;
    await license.save();

    const daysRemaining = Math.max(
      0,
      Math.ceil((newExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    res.json({
      success: true,
      message: `Recharge successful! Your ${license.planName} is active for ${daysRemaining} days.`,
      data: {
        subscriptionStatus: user.subscriptionStatus,
        subscriptionPlan: user.subscriptionPlan,
        planName: license.planName,
        licenseKey: user.licenseKey,
        licenseExpiresAt: user.licenseExpiresAt,
        daysRemaining,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionPlan: user.subscriptionPlan,
          licenseExpiresAt: user.licenseExpiresAt,
          licenseKey: user.licenseKey,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to redeem license.",
    });
  }
};

// ==========================================
// 3. GET LICENSE STATUS (Checks active license, days remaining, expiry)
//    URL: GET /api/license/status
// ==========================================
export const getLicenseStatus = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token required.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const now = new Date();
    const expiry = user.licenseExpiresAt ? new Date(user.licenseExpiresAt) : now;
    const isExpired = expiry <= now;

    if (isExpired && user.subscriptionStatus !== "expired") {
      user.subscriptionStatus = "expired";
      await user.save();
    }

    const diffMs = expiry.getTime() - now.getTime();
    const daysRemaining = isExpired ? 0 : Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    res.json({
      success: true,
      data: {
        subscriptionStatus: user.subscriptionStatus,
        subscriptionPlan: user.subscriptionPlan,
        licenseKey: user.licenseKey || "TRIAL-NO-KEY",
        licenseExpiresAt: user.licenseExpiresAt,
        daysRemaining,
        isExpired,
      },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message || "Unauthorized",
    });
  }
};

// ==========================================
// 4. GET MY LICENSES (History of generated / redeemed vouchers)
//    URL: GET /api/license/my-keys
// ==========================================
export const getMyLicenses = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token required.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const licenses = await License.find({
      $or: [{ purchasedByEmail: user.email }, { redeemedBy: user._id }],
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: licenses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch license history.",
    });
  }
};
