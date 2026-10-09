import AddonGroup from "../models/AddonGroup.js";
import { sendError, sendSuccess } from "../utils/response.js";

const defaultAddons = [
  { name: "Extra Cheese", selection: "Optional", active: true },
  { name: "Spice Level", selection: "Required", active: true },
];

// ==========================================
// 1. READ ALL: Saare Addon Groups fetch karna
//    URL: /api/addons
// ==========================================
export const getAddonGroups = async (req, res) => {
  try {
    let groups = await AddonGroup.find().sort({ createdAt: 1 });

    // Agar database empty hai toh initial default addons seed karo
    if (groups.length === 0) {
      groups = await AddonGroup.insertMany(defaultAddons);
    }

    sendSuccess(res, 200, "Addon groups fetched", groups);
  } catch (error) {
    sendError(res, 500, error.message || "Failed to fetch addon groups");
  }
};

// ==========================================
// 2. CREATE: Naya Addon Group create karna
//    URL: /api/addons
// ==========================================
export const createAddonGroup = async (req, res) => {
  try {
    const { name, selection = "Optional", active = true } = req.body;

    if (!name || !name.trim()) {
      return sendError(res, 400, "Addon group name is required");
    }

    const newGroup = await AddonGroup.create({
      name: name.trim(),
      selection,
      active: Boolean(active),
    });

    sendSuccess(res, 201, "Addon group created", newGroup);
  } catch (error) {
    sendError(res, 500, error.message || "Failed to create addon group");
  }
};

// ==========================================
// 3. UPDATE: Addon Group update karna
//    URL: /api/addons/:id
// ==========================================
export const updateAddonGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, selection, active } = req.body;

    const group = await AddonGroup.findByIdAndUpdate(
      id,
      { $set: { ...(name && { name: name.trim() }), ...(selection && { selection }), ...(active !== undefined && { active }) } },
      { new: true }
    );

    if (!group) {
      return sendError(res, 404, "Addon group not found");
    }

    sendSuccess(res, 200, "Addon group updated", group);
  } catch (error) {
    sendError(res, 500, error.message || "Failed to update addon group");
  }
};

// ==========================================
// 4. DELETE: Addon Group delete karna
//    URL: /api/addons/:id
// ==========================================
export const deleteAddonGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await AddonGroup.findByIdAndDelete(id);

    if (!group) {
      return sendError(res, 404, "Addon group not found");
    }

    sendSuccess(res, 200, "Addon group deleted", { id: group._id });
  } catch (error) {
    sendError(res, 500, error.message || "Failed to delete addon group");
  }
};
