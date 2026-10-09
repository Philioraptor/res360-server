import mongoose from "mongoose";

const addonGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    selection: {
      type: String,
      enum: ["Optional", "Required"],
      default: "Optional",
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

addonGroupSchema.virtual("id").get(function () {
  return this._id.toString();
});

const AddonGroup = mongoose.model("AddonGroup", addonGroupSchema);

export default AddonGroup;
