import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "restaurant360_super_secret_jwt_key";

// ==========================================
// 1. AUTHENTICATION: Verify JWT Token
// ==========================================
export const protect = async (req, res, next) => {
  try {
    let token = null;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Authentication token is required.",
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session token. Please log in again.",
      });
    }

    // Fetch user from DB
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account no longer exists.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Authentication failed.",
    });
  }
};

// ==========================================
// 2. AUTHORIZATION: Role-Based Access Control (RBAC)
// ==========================================
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: User role '${req.user?.role || "guest"}' is not authorized to perform this action.`,
      });
    }
    next();
  };
};

// ==========================================
// 3. SUBSCRIPTION CHECK: Ensure Restaurant License is Active
// ==========================================
export const requireActiveSubscription = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required before checking subscription.",
      });
    }

    const now = new Date();
    const expiry = req.user.licenseExpiresAt ? new Date(req.user.licenseExpiresAt) : now;
    const isExpired = expiry <= now || req.user.subscriptionStatus === "expired";

    if (isExpired) {
      // Auto-update user status in DB
      if (req.user.subscriptionStatus !== "expired") {
        req.user.subscriptionStatus = "expired";
        await req.user.save();
      }

      return res.status(403).json({
        success: false,
        isExpired: true,
        subscriptionExpired: true,
        message: "Subscription expired. Please recharge your 12-character license key to use Restaurant360 features.",
        plan: req.user.subscriptionPlan,
        expiredAt: req.user.licenseExpiresAt,
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Subscription verification failed.",
    });
  }
};
