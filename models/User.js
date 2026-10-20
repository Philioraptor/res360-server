import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    restaurantName: {
      type: String,
      default: "Restaurant 360",
      trim: true,
    },

    role: {
      type: String,
      enum: ["admin", "manager", "cashier", "kitchen", "waiter", "staff"],
      default: "staff",
    },

    subscriptionStatus: {
      type: String,
      enum: ["trial", "active", "expired"],
      default: "trial",
    },

    subscriptionPlan: {
      type: String,
      enum: ["trial", "monthly", "yearly", "custom"],
      default: "trial",
    },

    licenseKey: {
      type: String,
      default: "",
    },

    licenseExpiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Default 14-day free trial
    },

    activatedAt: {
      type: Date,
      default: Date.now,
    },

    failedLoginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
      default: null,
    },

    resetPasswordToken: {
      type: String,
      default: null,
    },

    resetPasswordExpires: {
      type: Date,
      default: null,
    },

    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ email: 1 });
userSchema.index({ licenseKey: 1 });

const User = mongoose.model("User", userSchema);

export default User;
