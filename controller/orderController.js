import Order from "../models/Order.js";
import KdsTicket from "../models/KdsTicket.js";
import Table from "../models/Table.js";
import { createOrderAndTicket } from "../services/orderService.js";
import { createKdsTicket } from "./kdsController.js";

// ==========================================
// 1. READ ALL: Saare orders fetch karna (GET)
//    Support query filter, e.g. /api/orders?status=Pending
// ==========================================
export const getOrders = async (req, res) => {
  try {
    const { status } = req.query;

    // Agar frontend se status filter aaya ho toh filter lagao
    const filter = {};
    if (status) {
      filter.status = status;
    }

    // Newest orders pehle dikhane ke liye sort by createdAt: -1
    const orders = await Order.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// 2. READ ONE: Single order details fetch karna (GET)
//    URL: /api/orders/:id (Accepts MongoDB _id or ORD-XXXX)
// ==========================================
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    // Order ko MongoDB _id ya unique string orderId dono se search karo
    const order = await Order.findOne({
      $or: [
        { orderId: id },
        ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : []),
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order nahi mila (Order not found).",
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// 3. CREATE: Naya order punch karna (POST)
//    URL: /api/orders
// ==========================================
export const createOrder = async (req, res) => {
  try {
    const {
      restaurantId = null,
      tableId = null,
      userId = null,
      table = "Takeaway",
      orderType = "dine-in",
      customerName = "Walk-in Customer",
      paymentMethod = "Cash",
      items = [],
      taxRate = 5,
      discount = 0,
      sendKitchen = true,
      total: clientTotal,
    } = req.body;

    // 1. Check karo items list khali toh nahi hai
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order me kam se kam ek item hona zaroori hai.",
      });
    }

    // 2. Order ID generate karo (e.g. ORD-1001)
    const count = await Order.countDocuments();
    const orderId = `ORD-${1001 + count}`;

    // 3. Format items and calculate total
    let calculatedTotal = 0;
    let itemsCount = 0;

    const orderItems = items.map((it) => {
      const itemPrice = Number(it.price || 0);
      const itemQty = Number(it.qty || it.quantity || 1);
      const sub = itemPrice * itemQty;
      calculatedTotal += sub;
      itemsCount += itemQty;

      // Agar it._id ya it.productId valid 24-character hex ObjectId ho toh store karo, warna null
      const rawId = it.productId || it._id;
      const isValidObjectId = rawId && /^[0-9a-fA-F]{24}$/.test(String(rawId));

      return {
        productId: isValidObjectId ? rawId : null,
        menuItemId: String(it.id || it.menuItemId || ""),
        name: it.name || "Menu Item",
        qty: itemQty,
        price: itemPrice,
        subtotal: sub,
        category: it.category || "",
        type: it.type || "Veg",
      };
    });

    const tax = (calculatedTotal * Number(taxRate || 0)) / 100;
    const computedOrderTotal = Math.max(0, calculatedTotal + tax - Number(discount || 0));
    const finalTotal = clientTotal !== undefined && clientTotal !== null
      ? Number(clientTotal)
      : computedOrderTotal;

    // 4. Create new Order in MongoDB
    const newOrder = await Order.create({
      orderId,
      customerName,
      orderType,
      paymentMethod,
      restaurantId,
      table,
      tableId,
      userId,
      items: orderItems,
      itemsCount,
      total: finalTotal,
      status: "Pending",
    });

    // 5. Kitchen Order Ticket (KDS) auto-create karo agar sendKitchen true hai
    let kdsTicket = null;
    if (sendKitchen) {
      try {
        const kdsCount = await KdsTicket.countDocuments();
        const ticketNo = `KOT-${1001 + kdsCount}`;
        const formattedOrderType = orderType
          ? orderType.charAt(0).toUpperCase() + orderType.slice(1)
          : "Dine-in";

        kdsTicket = await KdsTicket.create({
          ticketNo,
          orderType: formattedOrderType,
          location: table || "Table T1",
          stage: "new",
          startTime: new Date(),
          notes: `Customer: ${customerName} | Mode: ${paymentMethod}`,
          orderId: newOrder._id,
          items: orderItems.map((it) => ({
            name: it.name,
            qty: it.qty,
            checked: false,
          })),
        });
      } catch (kdsErr) {
        console.error("Auto KDS ticket creation error:", kdsErr.message);
      }
    }

    // 6. Table status update karo agar dine-in table ho
    if (table && table !== "Takeaway") {
      try {
        const matchedTableId = table.replace(/^Table\s*/i, "").trim();
        await Table.findOneAndUpdate(
          { $or: [{ tableId: matchedTableId }, { tableId: table }] },
          { status: "occupied" }
        );
      } catch (tblErr) {
        // Table status update is optional
      }
    }

    return res.status(201).json({
      success: true,
      message: "Order placed successfully.",
      data: {
        order: newOrder,
        ticket: kdsTicket,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// 4. UPDATE STATUS: Order status change karna (PUT)
//    URL: /api/orders/:id/status
// ==========================================
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Allowed status list check karo
    const allowedStatuses = [
      "Pending",
      "Preparing",
      "Served",
      "Completed",
      "Cancelled",
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${allowedStatuses.join(", ")}`,
      });
    }

    // Order find karo by _id ya orderId
    const order = await Order.findOne({
      $or: [
        { orderId: id },
        ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : []),
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order nahi mila (Order not found).",
      });
    }

    // Status update karke save karo
    order.status = status;
    const updatedOrder = await order.save();

    res.json({
      success: true,
      message: `Order status updated to '${status}' successfully.`,
      data: updatedOrder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// 5. DELETE: Order cancel ya delete karna (DELETE)
//    URL: /api/orders/:id
// ==========================================
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findOneAndDelete({
      $or: [
        { orderId: id },
        ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : []),
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order nahi mila (Order not found).",
      });
    }

    res.json({
      success: true,
      message: `Order ${order.orderId} deleted successfully.`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
