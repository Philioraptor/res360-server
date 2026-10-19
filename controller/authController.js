import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "restaurant360_super_secret_jwt_key";

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

    // Auto-seed default admin if database is brand new
    if (!user && cleanEmail === "admin@restaurant360.com" && password === "admin123") {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      user = await User.create({
        name: "Admin User",
        email: "admin@restaurant360.com",
        password: hashedPassword,
        role: "admin",
        subscriptionStatus: "active",
        subscriptionPlan: "yearly",
        licenseExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });
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
    // If user does not exist, run a dummy bcrypt compare so timing is identical
    const dummyHash = "$2a$10$wK1Wwz8b6L0B0FmO5vW4u.78o8/1uV3N6s5eQ4F6F/uH3L6q.K6QG";
    const passwordToCompare = user ? user.password : dummyHash;
    const isPasswordValid = await bcrypt.compare(password, passwordToCompare);

    if (!user || !isPasswordValid) {
      if (user) {
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        // Lock account after 5 consecutive failed attempts
        if (user.failedLoginAttempts >= 5) {
          user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
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

    // JWT Token generate karo (7 days expiry)
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Helper to calculate days remaining
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
// 2. REGISTER: Naya staff / admin create karna
//    URL: /api/auth/register
// ==========================================
export const register = async (req, res) => {
  try {
    const { name, email, password, role = "staff" } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check existing user
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: ["admin", "manager", "staff"].includes(role) ? role : "staff",
    });

    const token = jwt.sign(
      {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
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
