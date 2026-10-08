import { sendError, sendSuccess } from '../utils/response.js';
import { createOrderAndTicket } from '../services/orderService.js';
import { advanceTicketById, toggleTicketItemCheck } from '../services/kdsService.js';
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import Table from "../models/Table.js";
const menuData = [
  { id: 1, name: 'Paneer Tikka', category: 'Starters', type: 'Veg', price: 280 },
  { id: 2, name: 'Chicken 65', category: 'Starters', type: 'Non-Veg', price: 320 },
  { id: 3, name: 'Veg Spring Roll', category: 'Starters', type: 'Veg', price: 180 },
  { id: 4, name: 'Fish Fry', category: 'Starters', type: 'Non-Veg', price: 350 },
  { id: 5, name: 'Mushroom Manchurian', category: 'Starters', type: 'Veg', price: 220 },
  { id: 6, name: 'Butter Naan', category: 'Breads', type: 'Veg', price: 50 },
  { id: 7, name: 'Garlic Naan', category: 'Breads', type: 'Veg', price: 60 },
  { id: 8, name: 'Tandoori Roti', category: 'Breads', type: 'Veg', price: 30 },
  { id: 9, name: 'Paneer Butter Masala', category: 'Main Course', type: 'Veg', price: 280 },
  { id: 10, name: 'Chicken Biryani', category: 'Main Course', type: 'Non-Veg', price: 320 },
  { id: 11, name: 'Mango Lassi', category: 'Beverages', type: 'Veg', price: 90 },
  { id: 12, name: 'Gulab Jamun', category: 'Desserts', type: 'Veg', price: 110 }
];

const productCategories = [
  { id: 1, name: 'Food', color: 'None', description: 'Food dishes and meals', active: true },
  { id: 2, name: 'Beverages', color: 'None', description: 'Hot & cold drinks', active: true }
];

const addonGroups = [
  { id: 1, name: 'Extra Cheese', selection: 'Optional', active: true },
  { id: 2, name: 'Spice Level', selection: 'Required', active: true }
];

const products = [
  { id: 1, name: 'Meal', initials: 'ME', badgeColor: '#84cc16', category: 'Food', active: true, price: 250 },
  { id: 2, name: 'Tea', initials: 'TE', badgeColor: '#84cc16', category: 'Beverages', active: true, price: 40 },
  { id: 3, name: 'Coffee', initials: 'CO', badgeColor: '#14b8a6', category: 'Beverages', active: true, price: 80 },
  { id: 4, name: 'Snack', initials: 'SN', badgeColor: '#14b8a6', category: 'Food', active: true, price: 120 }
];

const inventory = [
  { id: 1, sku: 'ING-001', item: 'Tomato', category: 'Vegetables', stock: 32, reorderLevel: 15, unit: 'kg' },
  { id: 2, sku: 'ING-002', item: 'Onion', category: 'Vegetables', stock: 28, reorderLevel: 20, unit: 'kg' },
  { id: 3, sku: 'ING-003', item: 'Paneer', category: 'Dairy', stock: 12, reorderLevel: 10, unit: 'kg' },
  { id: 4, sku: 'ING-004', item: 'Rice', category: 'Grains', stock: 9, reorderLevel: 12, unit: 'kg' }
];

const floorTables = {
  'Ground Floor': [
    { id: 'T1', seats: 4, status: 'available' },
    { id: 'T2', seats: 4, status: 'available' },
    { id: 'T3', seats: 4, status: 'available' },
    { id: 'T4', seats: 8, status: 'available' },
    { id: 'T5', seats: 2, status: 'available' },
    { id: 'T6', seats: 4, status: 'available' }
  ],
  'First Floor': [
    { id: 'T7', seats: 4, status: 'available' },
    { id: 'T8', seats: 4, status: 'available' },
    { id: 'T9', seats: 6, status: 'available' }
  ],
  Terrace: [
    { id: 'T10', seats: 4, status: 'available' },
    { id: 'T11', seats: 6, status: 'available' }
  ],
  'VIP Cabin': [
    { id: 'V1', seats: 6, status: 'available' },
    { id: 'V2', seats: 8, status: 'available' }
  ]
};

const customers = [
  { id: 1, name: 'Riya Sharma', loyalty: 'Gold', totalSpent: 8450, visits: 18 },
  { id: 2, name: 'Aman Verma', loyalty: 'Silver', totalSpent: 5320, visits: 11 },
  { id: 3, name: 'Mehul Patel', loyalty: 'Platinum', totalSpent: 12050, visits: 21 }
];

const kdsTickets = [
  {
    id: 101,
    ticketNo: '#KOT-101',
    orderType: 'Dine-in',
    location: 'Table T9',
    stage: 'new',
    startTime: Date.now() - 3 * 60 * 1000,
    items: [
      { id: 1, name: 'Paneer Tikka', qty: 2, checked: false },
      { id: 2, name: 'Butter Naan', qty: 2, checked: false },
      { id: 3, name: 'Gulab Jamun', qty: 1, checked: false }
    ],
    notes: 'Extra Spicy, Serve starters first'
  },
  {
    id: 102,
    ticketNo: '#KOT-102',
    orderType: 'Takeaway',
    location: 'Pickup',
    stage: 'preparing',
    startTime: Date.now() - 8 * 60 * 1000,
    items: [
      { id: 4, name: 'Chicken 65', qty: 1, checked: true },
      { id: 5, name: 'Garlic Naan', qty: 3, checked: false }
    ],
    notes: 'No onions in salad'
  },
  {
    id: 103,
    ticketNo: '#KOT-103',
    orderType: 'Delivery',
    location: 'Swiggy #94',
    stage: 'ready',
    startTime: Date.now() - 14 * 60 * 1000,
    items: [
      { id: 6, name: 'Chicken Biryani', qty: 1, checked: true },
      { id: 7, name: 'Mango Lassi', qty: 2, checked: true }
    ],
    notes: 'Delivery rider arriving soon'
  }
];

const orders = [
  { id: 'ORD-1001', table: 'Table 1', total: 1460, status: 'Preparing', items: 4 },
  { id: 'ORD-1002', table: 'Table 4', total: 980, status: 'Served', items: 3 },
  { id: 'ORD-1003', table: 'Takeaway', total: 640, status: 'Pending', items: 2 }
];

const salesReport = {
  todaySales: 45600,
  weeklySales: 278500,
  topCategory: 'Main Course',
  growth: 12.5,
  month: 'August 2026'
};

const dashboardSummary = {
  revenue: 182450,
  orders: 384,
  avgTicket: 475,
  occupancy: 76,
  topSelling: ['Paneer Tikka', 'Chicken Biryani', 'Mango Lassi']
};

const chatbotSuggestions = [
  'How many active tables are occupied right now?',
  'Show low-stock items in inventory.',
  'Summarize today’s sales performance.',
  'Which dishes are trending this evening?'
];

const settings = {
  branchName: 'Restaurant360 - Main Branch',
  taxRate: 5,
  currency: 'INR',
  printerEnabled: true,
  autoPrintKOT: true,
  enableLoyalty: true,
  theme: 'dark'
};

export const getHealthCheck = (req, res) => {
  sendSuccess(res, 200, 'Backend is connected and running!', {
    timestamp: new Date().toISOString(),
    status: 'ok'
  });
};

export const getDashboardSummary = (req, res) => {
  sendSuccess(res, 200, 'Dashboard summary loaded', dashboardSummary);
};

export const getMenu = (req, res) => {
  sendSuccess(res, 200, 'Menu fetched', menuData);
};

export const getMenuCategories = (req, res) => {
  const categories = [...new Set(menuData.map((item) => item.category))];
  sendSuccess(res, 200, 'Categories fetched', categories);
};

export const getProducts = async (req, res) => {
  try {
    const products = await Product.find().populate("category");

    const categories = await Category.find();

    sendSuccess(res, 200, "Products fetched", {
      categories,
      products,
    });

  } catch (error) {
    sendError(res, 500, error.message);
  }
};
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      price,
      active = true,
      sku = "",
      barcode = "",
      imageUrl = "",
      tags = [],
    } = req.body;

    if (!name || !category || price === undefined) {
      return sendError(res, 400, "Name, Category and Price are required.");
    }
    console.log("Request Body:", req.body);
console.log("Category received:", category);

    const categoryExists = await Category.findById(category);

    if (!categoryExists) {
      return sendError(res, 400, "Invalid category selected.");
    }

    const product = await Product.create({
      name,
      initials: name.substring(0, 2).toUpperCase(),
      badgeColor: "#14b8a6",
      category: categoryExists._id,
      price,
      active,
      sku,
      barcode,
      imageUrl,
      tags,
    });

    const populatedProduct = await Product.findById(product._id).populate("category");

    sendSuccess(res, 201, "Product created successfully", populatedProduct);

  } catch (error) {
    console.error(error);
    sendError(res, 500, error.message);
  }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!product) {
      return sendError(res, 404, "Product not found");
    }

    sendSuccess(res, 200, "Product updated", product);

  } catch (error) {
    sendError(res, 500, error.message);
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return sendError(res, 404, "Product not found");
    }

    sendSuccess(res, 200, "Product deleted", product);

  } catch (error) {
    sendError(res, 500, error.message);
  }
};

export const getProductCategories = async (req, res) => {
  try {
    const categories = await Category.find();

    sendSuccess(
      res,
      200,
      "Product categories fetched",
      categories
    );

  } catch (error) {
    sendError(res, 500, error.message);
  }
};

export const createCategory = async (req, res) => {
  try {
    const {
      name,
      description = "",
      color = "None",
      active = true,
    } = req.body;

    if (!name) {
      return sendError(res, 400, "Category name is required");
    }

    const category = await Category.create({
      name,
      description,
      color,
      active,
    });

    sendSuccess(res, 201, "Category created", category);

  } catch (error) {
    sendError(res, 500, error.message);
  }
};

export const getAddonGroups = (req, res) => {
  sendSuccess(res, 200, 'Addon groups fetched', addonGroups);
};

export const createAddonGroup = (req, res) => {
  const { name, selection = 'Optional', active = true } = req.body;

  if (!name) {
    return sendError(res, 400, 'Addon group name is required');
  }

  const newGroup = { id: Date.now(), name, selection, active };
  addonGroups.push(newGroup);
  sendSuccess(res, 201, 'Addon group created', newGroup);
};

export const getInventory = (req, res) => {
  sendSuccess(res, 200, 'Inventory fetched', inventory);
};

export const createInventoryItem = (req, res) => {
  const { item, category, stock, reorderLevel, unit = 'kg' } = req.body;

  if (!item || !category || stock === undefined || reorderLevel === undefined) {
    return sendError(res, 400, 'Item, category, stock and reorderLevel are required');
  }

  const newItem = {
    id: Date.now(),
    sku: `ING-${Date.now()}`,
    item,
    category,
    stock: Number(stock),
    reorderLevel: Number(reorderLevel),
    unit
  };

  inventory.push(newItem);
  sendSuccess(res, 201, 'Inventory item created', newItem);
};

export const updateInventoryItem = (req, res) => {
  const { id } = req.params;
  const index = inventory.findIndex((item) => item.id === Number(id));

  if (index === -1) {
    return sendError(res, 404, 'Inventory item not found');
  }

  inventory[index] = { ...inventory[index], ...req.body };
  sendSuccess(res, 200, 'Inventory item updated', inventory[index]);
};

export const getLowStockInventory = (req, res) => {
  const lowStock = inventory.filter((item) => item.stock <= item.reorderLevel);
  sendSuccess(res, 200, 'Low stock inventory fetched', lowStock);
};

// ===============================
// TABLE MANAGEMENT
// ===============================

export const getTables = async (req, res) => {
  try {
    const tables = await Table.find().sort({
      floor: 1,
      tableId: 1,
    });

    const floorTables = {};

    tables.forEach((table) => {
      if (!floorTables[table.floor]) {
        floorTables[table.floor] = [];
      }

      floorTables[table.floor].push({
        id: table.tableId,
        seats: table.seats,
        status: table.status,
      });
    });

    sendSuccess(res, 200, 'Table layout fetched', floorTables);
  } catch (error) {
    console.error('Get tables error:', error);
    sendError(res, 500, 'Failed to fetch tables');
  }
};


export const createTable = async (req, res) => {
  try {
    const {
      tableId,
      floor = 'Ground Floor',
      seats = 4,
      status = 'available',
    } = req.body;

    if (!tableId) {
      return sendError(res, 400, 'tableId is required');
    }

    const existingTable = await Table.findOne({ tableId });

    if (existingTable) {
      return sendError(res, 409, 'Table already exists');
    }

    const table = await Table.create({
      tableId,
      floor,
      seats: Number(seats),
      status,
    });

    const formattedTable = {
      id: table.tableId,
      seats: table.seats,
      status: table.status,
    };

    sendSuccess(res, 201, 'Table added', formattedTable);
  } catch (error) {
    console.error('Create table error:', error);
    sendError(res, 500, 'Failed to create table');
  }
};


export const updateTableStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      'available',
      'occupied',
      'reserved',
      'billing',
      'cleaning',
    ];

    if (!allowedStatuses.includes(status)) {
      return sendError(res, 400, 'Invalid table status');
    }

    const table = await Table.findOneAndUpdate(
      { tableId: id },
      { status },
      { new: true }
    );

    if (!table) {
      return sendError(res, 404, 'Table not found');
    }

    const formattedTable = {
      id: table.tableId,
      seats: table.seats,
      status: table.status,
    };

    sendSuccess(res, 200, 'Table status updated', formattedTable);
  } catch (error) {
    console.error('Update table status error:', error);
    sendError(res, 500, 'Failed to update table status');
  }
};
export const deleteTable = async (req, res) => {
  try {
    const { id } = req.params;

    const table = await Table.findOneAndDelete({
      tableId: id,
    });

    if (!table) {
      return sendError(res, 404, 'Table not found');
    }

    sendSuccess(res, 200, 'Table deleted', {
      id: table.tableId,
    });
  } catch (error) {
    console.error('Delete table error:', error);
    sendError(res, 500, 'Failed to delete table');
  }
};

export const getKdsTickets = async (req, res) => {
  try {
    const tickets = await KdsTicket.find()
      .sort({ createdAt: -1 });

    sendSuccess(
      res,
      200,
      'KDS tickets fetched',
      tickets
    );

  } catch (error) {
    console.error("KDS fetch error:", error);

    sendError(
      res,
      500,
      error.message
    );
  }
};

export const advanceKdsTicket = async (req, res) => {
  try {
    const ticket = await advanceTicketById(
      req.params.id
    );

    sendSuccess(
      res,
      200,
      'Ticket advanced',
      ticket
    );

  } catch (error) {
    console.error("KDS advance error:", error);

    sendError(
      res,
      error.statusCode || 400,
      error.message || 'Ticket update failed'
    );
  }
};

export const toggleKdsItemCheck = async (req, res) => {
  try {
    const ticket = await toggleTicketItemCheck(
      req.params.id,
      req.params.itemId
    );

    sendSuccess(
      res,
      200,
      'Item checked updated',
      ticket
    );

  } catch (error) {
    console.error("KDS item update error:", error);

    sendError(
      res,
      error.statusCode || 400,
      error.message || 'Item update failed'
    );
  }
};

export const getCustomers = (req, res) => {
  sendSuccess(res, 200, 'Customers fetched', customers);
};

export const getCustomerById = (req, res) => {
  const { id } = req.params;
  const customer = customers.find((item) => item.id === Number(id));

  if (!customer) {
    return sendError(res, 404, 'Customer not found');
  }

  sendSuccess(res, 200, 'Customer fetched', customer);
};

export const getReports = (req, res) => {
  sendSuccess(res, 200, 'Sales report fetched', salesReport);
};

export const getSaleReport = (req, res) => {
  sendSuccess(res, 200, 'Sales report fetched', salesReport);
};

export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 });

    sendSuccess(
      res,
      200,
      'Orders fetched',
      orders
    );

  } catch (error) {
    console.error("Orders fetch error:", error);

    sendError(
      res,
      500,
      error.message
    );
  }
};

export const createOrder = async (req, res) => {
  try {
    const {
      restaurantId,
      tableId = null,
      userId = null,
      table = "Takeaway",
      items = [],
      taxRate = 5,
      discount = 0,
      sendKitchen = true
    } = req.body;

    if (!restaurantId) {
      return sendError(
        res,
        400,
        "restaurantId is required"
      );
    }

    if (!items.length) {
      return sendError(
        res,
        400,
        "At least one item is required"
      );
    }

    const result = await createOrderAndTicket({
      restaurantId,
      tableId,
      userId,
      table,
      items,
      taxRate,
      discount,
      sendKitchen
    });

    sendSuccess(
      res,
      201,
      "Order created successfully",
      result
    );

  } catch (error) {
    console.error("Order creation error:", error);

    sendError(
      res,
      error.statusCode || 400,
      error.message || "Order creation failed"
    );
  }
};

export const getSettings = (req, res) => {
  sendSuccess(res, 200, 'Settings fetched', settings);
};

export const updateSettings = (req, res) => {
  Object.assign(settings, req.body);
  sendSuccess(res, 200, 'Settings updated', settings);
};

export const getChatbotSuggestions = (req, res) => {
  sendSuccess(res, 200, 'Suggestions fetched', chatbotSuggestions);
};

export const sendChatbotMessage = (req, res) => {
  const { message } = req.body;
  const lowerMessage = String(message || '').toLowerCase();

  if (!lowerMessage.trim()) {
    return sendError(res, 400, 'A message is required');
  }

  let reply = 'I can help with sales, kitchen flow, inventory, and table status.';

  if (lowerMessage.includes('sales') || lowerMessage.includes('revenue')) {
    reply = `Today’s sales are ₹${salesReport.todaySales.toLocaleString('en-IN')} with ${salesReport.growth}% growth.`;
  } else if (lowerMessage.includes('inventory') || lowerMessage.includes('stock')) {
    reply = 'Low stock alert: Rice and Paneer need replenishment soon.';
  } else if (lowerMessage.includes('table') || lowerMessage.includes('occupancy')) {
    const occupiedCount = Object.values(floorTables).flat().filter((table) => table.status === 'occupied').length;
    reply = `Current occupancy is ${dashboardSummary.occupancy}% with ${occupiedCount} occupied tables.`;
  } else if (lowerMessage.includes('dish') || lowerMessage.includes('trending')) {
    reply = `Trending items today: ${dashboardSummary.topSelling.join(', ')}.`;
  }

  sendSuccess(res, 200, 'Chatbot reply generated', { reply, timestamp: new Date().toISOString() });
};