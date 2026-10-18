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

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = await User.findOne({ email: cleanEmail });

    // Agar database me koi user nahi hai aur default admin se login kar rahe hain, auto-seed karo
    if (!user && cleanEmail === "admin@restaurant360.com" && password === "admin123") {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      user = await User.create({
        name: "Admin User",
        email: "admin@restaurant360.com",
        password: hashedPassword,
        role: "admin",
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Password match check karo
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

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
