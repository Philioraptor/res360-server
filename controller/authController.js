import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import License from "../models/License.js";
import { verifyAndDecryptLicenseKey, PLAN_CONFIG } from "./licenseController.js";

const JWT_SECRET = process.env.JWT_SECRET || "restaurant360_super_secret_jwt_key";

// Helper: Seed demo accounts on demand if not found
async function seedDemoUserIfNeeded(email, password, name, role, restaurantName) {
  let user = await User.findOne({ email });
  if (!user) {
    const hashedPassword = await bcrypt.hash(password, 10);
    user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      restaurantName,
      subscriptionStatus: "active",
      subscriptionPlan: "yearly",
      licenseExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });
  }
  return user;
}

// ==========================================
// 1. LOGIN: User credentials verify karke JWT token dena
//    URL: /api/auth/login
// ==========================================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Type validation (Prevent NoSQL Injection)
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid input types provided.",
      });
    }

    if (!email.trim() || !password.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // 2. Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.trim().toLowerCase();
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    let user = await User.findOne({ email: cleanEmail });

    // Auto-seed predefined demo roles if they don't exist yet
    if (!user) {
      if (cleanEmail === "admin@restaurant360.com" && password === "admin123") {
        user = await seedDemoUserIfNeeded("admin@restaurant360.com", "admin123", "Admin / Owner", "admin", "Grand Bistro 360");
      } else if (cleanEmail === "cashier@restaurant360.com" && password === "cashier123") {
        user = await seedDemoUserIfNeeded("cashier@restaurant360.com", "cashier123", "Cashier Rahul", "cashier", "Grand Bistro 360");
      } else if (cleanEmail === "kitchen@restaurant360.com" && password === "chef123") {
        user = await seedDemoUserIfNeeded("kitchen@restaurant360.com", "chef123", "Head Chef Sanjeev", "kitchen", "Grand Bistro 360");
      } else if (cleanEmail === "waiter@restaurant360.com" && password === "waiter123") {
        user = await seedDemoUserIfNeeded("waiter@restaurant360.com", "waiter123", "Captain Amit", "waiter", "Grand Bistro 360");
      }
    }

    // 3. Brute-Force Check: Check if account is temporarily locked
    if (user && user.lockUntil && user.lockUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockUntil - new Date()) / (1000 * 60));
      return res.status(429).json({
        success: false,
        message: `Account is temporarily locked due to multiple failed attempts. Please try again in ${remainingMinutes} minute(s).`,
      });
    }

    // 4. Timing Attack Mitigation
    const dummyHash = "$2a$10$wK1Wwz8b6L0B0FmO5vW4u.78o8/1uV3N6s5eQ4F6F/uH3L6q.K6QG";
    const passwordToCompare = user ? user.password : dummyHash;
    const isPasswordValid = await bcrypt.compare(password, passwordToCompare);

    if (!user || !isPasswordValid) {
      if (user) {
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        if (user.failedLoginAttempts >= 5) {
          user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
          await user.save();
          return res.status(429).json({
            success: false,
            message: "Account has been locked for 15 minutes due to 5 failed login attempts.",
          });
        }
        await user.save();
      }

      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Successful login: Reset failed attempts & lockout
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    // JWT Token generate (7 days expiry)
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        restaurantName: user.restaurantName || "Restaurant 360",
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const now = new Date();
    const expiry = user.licenseExpiresAt ? new Date(user.licenseExpiresAt) : now;
    const isExpired = expiry <= now;
    const daysRemaining = isExpired ? 0 : Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          restaurantName: user.restaurantName || "Restaurant 360",
          subscriptionStatus: isExpired ? "expired" : (user.subscriptionStatus || "trial"),
          subscriptionPlan: user.subscriptionPlan || "trial",
          licenseExpiresAt: user.licenseExpiresAt,
          licenseKey: user.licenseKey || "",
          daysRemaining,
          isExpired,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Login failed",
    });
  }
};

// ==========================================
// 2. REGISTER: Naya Restaurant Owner / User create karna
//    URL: /api/auth/register
// ==========================================
export const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      restaurantName = "My Restaurant",
      role = "admin",
      licenseKey = "",
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, and password are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.trim().toLowerCase();
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    // Check existing user
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists. Please log in.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const validRoles = ["admin", "manager", "cashier", "kitchen", "waiter", "staff"];
    const assignedRole = validRoles.includes(role) ? role : "admin";

    // Subscription & License Handling
    let subscriptionStatus = "trial";
    let subscriptionPlan = "trial";
    let savedLicenseKey = "";
    let licenseExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days trial default
    let licenseDoc = null;

    if (licenseKey && licenseKey.trim()) {
      const verifyResult = verifyAndDecryptLicenseKey(licenseKey.trim());
      if (!verifyResult.valid) {
        return res.status(400).json({
          success: false,
          message: verifyResult.message || "Invalid or tampered license key.",
        });
      }

      licenseDoc = await License.findOne({ licenseKey: verifyResult.formattedKey });
      if (!licenseDoc) {
        return res.status(404).json({
          success: false,
          message: "License key not found in central registry.",
        });
      }

      if (licenseDoc.status === "redeemed") {
        return res.status(400).json({
          success: false,
          message: "This license key has already been redeemed and cannot be reused.",
        });
      }

      subscriptionStatus = "active";
      subscriptionPlan = licenseDoc.plan;
      savedLicenseKey = licenseDoc.licenseKey;
      licenseExpiresAt = new Date(Date.now() + licenseDoc.durationDays * 24 * 60 * 60 * 1000);
    }

    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      restaurantName: restaurantName.trim() || "My Restaurant",
      role: assignedRole,
      subscriptionStatus,
      subscriptionPlan,
      licenseKey: savedLicenseKey,
      licenseExpiresAt,
      activatedAt: new Date(),
    });

    // Mark license redeemed if provided
    if (licenseDoc) {
      licenseDoc.status = "redeemed";
      licenseDoc.redeemedBy = newUser._id;
      licenseDoc.redeemedAt = new Date();
      licenseDoc.expiresAt = licenseExpiresAt;
      await licenseDoc.save();
    }

    const token = jwt.sign(
      {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        restaurantName: newUser.restaurantName,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const now = new Date();
    const expiry = new Date(newUser.licenseExpiresAt);
    const daysRemaining = Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    res.status(201).json({
      success: true,
      message: licenseDoc
        ? `Registration successful! Your ${licenseDoc.planName} is active for ${daysRemaining} days.`
        : "Registration successful! Welcome to your 14-day free trial of Restaurant360.",
      data: {
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          restaurantName: newUser.restaurantName,
          subscriptionStatus: newUser.subscriptionStatus,
          subscriptionPlan: newUser.subscriptionPlan,
          licenseKey: newUser.licenseKey,
          licenseExpiresAt: newUser.licenseExpiresAt,
          daysRemaining,
          isExpired: false,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Registration failed",
    });
  }
};

// ==========================================
// 3. ME: Current authenticated user details
//    URL: /api/auth/me
// ==========================================
export const getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const now = new Date();
    const expiry = user.licenseExpiresAt ? new Date(user.licenseExpiresAt) : now;
    const isExpired = expiry <= now;
    const daysRemaining = isExpired ? 0 : Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (isExpired && user.subscriptionStatus !== "expired") {
      user.subscriptionStatus = "expired";
      await user.save();
    }

    res.json({
      success: true,
      data: {
        ...user.toObject(),
        daysRemaining,
        isExpired,
      },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};
