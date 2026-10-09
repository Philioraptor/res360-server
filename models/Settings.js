import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    branchName: {
      type: String,
      default: "Restaurant360 - Main Branch",
    },

    name: {
      type: String,
      default: "Restaurant360",
    },

    phone: {
      type: String,
      default: "",
    },

    address: {
      type: String,
      default: "",
    },

    fssai: {
      type: String,
      default: "",
    },

    gstin: {
      type: String,
      default: "",
    },

    taxRate: {
      type: Number,
      default: 5,
    },

    gst: {
      type: String,
      default: "5",
    },

    serviceCharge: {
      type: String,
      default: "0",
    },

    packingCharge: {
      type: String,
      default: "0",
    },

    currency: {
      type: String,
      default: "INR",
    },

    printerEnabled: {
      type: Boolean,
      default: true,
    },

    autoPrintKOT: {
      type: Boolean,
      default: true,
    },

    printerName: {
      type: String,
      default: "Kitchen Printer",
    },

    enableLoyalty: {
      type: Boolean,
      default: true,
    },

    theme: {
      type: String,
      enum: ["dark", "light"],
      default: "dark",
    },
  },
  {
    timestamps: true,
  }
);

const Settings = mongoose.model(
  "Settings",
  settingsSchema
);

export default Settings;