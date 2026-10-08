import KdsTicket from "../models/KdsTicket.js";
import Order from "../models/Order.js";

// ==========================================
// 1. CREATE: Naya KDS Ticket create karna (POST)
// ==========================================
export const createKdsTicket = async (req, res) => {
  try {
    const { orderType, location, items, notes, orderId } = req.body;

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Items list is required to create a KDS ticket.",
      });
    }

    // Auto-generate ticket number (e.g. KOT-1001)
    const count = await KdsTicket.countDocuments();
    const ticketNo = `KOT-${1001 + count}`;

    // Clean items array
    const formattedItems = items.map((item) => ({
      name: item.name || "Menu Item",
      qty: Number(item.qty || item.quantity || 1),
      checked: Boolean(item.checked || false),
    }));

    const ticket = await KdsTicket.create({
      ticketNo,
      orderType: orderType || "Dine-in",
      location: location || "Table T1",
      stage: "new",
      startTime: new Date(),
      notes: notes || "",
      orderId: orderId || null,
      items: formattedItems,
    });

    res.status(201).json({
      success: true,
      message: "KDS ticket created successfully.",
      data: ticket,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// 2. READ ALL: Saare KDS Tickets fetch karna (GET)
// ==========================================
export const getKdsTickets = async (req, res) => {
  try {
    const tickets = await KdsTicket.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: tickets.length,
      data: tickets,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// 3. READ ONE: Ek single ticket fetch karna by ID (GET)
// ==========================================
export const getKdsTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await KdsTicket.findOne({
      $or: [
        { ticketNo: id },
        ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : []),
      ],
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "KDS ticket not found.",
      });
    }

    res.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// 4. UPDATE: Ticket ka Stage aage badhana (PUT)
//    new -> preparing -> ready
// ==========================================
export const advanceKdsTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await KdsTicket.findOne({
      $or: [
        { ticketNo: id },
        ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : []),
      ],
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "KDS ticket not found.",
      });
    }

    // Stage transition logic
    if (ticket.stage === "new") {
      ticket.stage = "preparing";
    } else if (ticket.stage === "preparing") {
      ticket.stage = "ready";
    }

    await ticket.save();

    // Order status synchronization
    if (ticket.orderId) {
      const order = await Order.findById(ticket.orderId);
      if (order) {
        if (ticket.stage === "preparing") {
          order.status = "Preparing";
        } else if (ticket.stage === "ready") {
          order.status = "Served";
        }
        await order.save();
      }
    }

    res.json({
      success: true,
      message: `Ticket moved to stage: ${ticket.stage}`,
      data: ticket,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// 5. UPDATE ITEM: Ticket item check/uncheck karna (PUT)
// ==========================================
export const toggleKdsItemCheck = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const ticket = await KdsTicket.findOne({
      $or: [
        { ticketNo: id },
        ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : []),
      ],
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "KDS ticket not found.",
      });
    }

    const item = ticket.items.find(
      (it) => it._id?.toString() === itemId || it.name === itemId
    );

    if (item) {
      item.checked = !item.checked;
      await ticket.save();
    }

    res.json({
      success: true,
      message: "Item status toggled.",
      data: ticket,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// 6. DELETE: KDS Ticket remove / delete karna (DELETE)
// ==========================================
export const deleteKdsTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await KdsTicket.findOneAndDelete({
      $or: [
        { ticketNo: id },
        ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : []),
      ],
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "KDS ticket not found.",
      });
    }

    res.json({
      success: true,
      message: "KDS ticket deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
