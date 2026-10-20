import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import License from "../models/License.js";

const JWT_SECRET = process.env.JWT_SECRET || "restaurant360_super_secret_jwt_key";
const LICENSE_SECRET = process.env.LICENSE_SECRET || "res360_cryptographic_license_master_secret_2026";

// Plan definitions
export const PLAN_CONFIG = {
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

// =========================================================================
// CRYPTOGRAPHIC HELPER: Generate Encrypted & Tamper-Proof 12-char Key
// Format: R360-<4 char payload (plan + nonce)>-<4 char HMAC signature>
// Example: R360-YA4F-7D29
// =========================================================================
export function generateEncryptedLicenseKey(planId = "yearly") {
  const planCode = planId === "yearly" ? "Y" : planId === "custom" ? "C" : "M";
  // 3 random hexadecimal/alphanumeric characters for entropy
  const nonce = crypto.randomBytes(2).toString("hex").toUpperCase().slice(0, 3);
  const payload = `${planCode}${nonce}`; // Exactly 4 chars, e.g. "Y8A2"

  // Cryptographic HMAC-SHA256 signature using the server's private secret
  const hmac = crypto.createHmac("sha256", LICENSE_SECRET);
  hmac.update(payload);
  const signature = hmac.digest("hex").toUpperCase().slice(0, 4); // 4 chars

  return `R360-${payload}-${signature}`;
}

// =========================================================================
// CRYPTOGRAPHIC HELPER: Verify Signature & Decrypt Plan
// =========================================================================
export function verifyAndDecryptLicenseKey(licenseKey) {
  if (!licenseKey || typeof licenseKey !== "string") {
    return { valid: false, message: "License key is required." };
  }

  let clean = licenseKey.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!clean.startsWith("R360") && clean.length === 8) {
    clean = "R360" + clean;
  }

  if (clean.length !== 12 || !clean.startsWith("R360")) {
    return { valid: false, message: "Invalid license key format. Must be R360-XXXX-XXXX." };
  }

  const payload = clean.slice(4, 8); // 4 chars
  const signature = clean.slice(8, 12); // 4 chars

  // Verify HMAC-SHA256 signature against private secret
  const hmac = crypto.createHmac("sha256", LICENSE_SECRET);
  hmac.update(payload);
  const expectedSignature = hmac.digest("hex").toUpperCase().slice(0, 4);

  if (signature !== expectedSignature) {
    return {
      valid: false,
      message: "Cryptographic signature check failed: Invalid or tampered license key.",
    };
  }

  // Decrypt plan from payload
  const planCode = payload[0];
  const planId = planCode === "Y" ? "yearly" : planCode === "C" ? "custom" : "monthly";

  return {
    valid: true,
    planId,
    payload,
    formattedKey: `R360-${payload}-${signature}`,
  };
}

// ==========================================
// 1. PURCHASE LICENSE (Called by Portfolio site during checkout)
//    NO password required - pure license voucher generation!
//    URL: POST /api/license/purchase
// ==========================================
export const purchaseLicense = async (req, res) => {
  try {
    const { email, name, planId = "yearly", paymentDetails = {} } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: "Customer name and email address are required for invoice/voucher generation.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const planInfo = PLAN_CONFIG[planId] || PLAN_CONFIG.monthly;

    // Generate cryptographic encrypted key
    let licenseKey = generateEncryptedLicenseKey(planId);

    // Ensure uniqueness in DB
    let existing = await License.findOne({ licenseKey });
    while (existing) {
      licenseKey = generateEncryptedLicenseKey(planId);
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
      purchasedByName: cleanName,
      paymentDetails,
    });

    res.status(201).json({
      success: true,
      message: "Encrypted license key generated successfully!",
      data: {
        licenseKey: license.licenseKey,
        plan: license.plan,
        planName: license.planName,
        durationDays: license.durationDays,
        pricePaid: license.pricePaid,
        currency: license.currency,
        paymentId: license.paymentId,
        purchasedByEmail: license.purchasedByEmail,
        purchasedByName: license.purchasedByName,
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

    // Cryptographic signature check & decryption
    const verifyResult = verifyAndDecryptLicenseKey(licenseKey);
    if (!verifyResult.valid) {
      return res.status(400).json({
        success: false,
        message: verifyResult.message,
      });
    }

    const license = await License.findOne({ licenseKey: verifyResult.formattedKey });

    if (!license) {
      return res.status(404).json({
        success: false,
        message: "License key not found in central registry.",
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

    // Calculate new expiration date (Stacking model)
    const now = new Date();
    let baseDate = now;

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
