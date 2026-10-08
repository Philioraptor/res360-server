import express from 'express';

import {
  getHealthCheck,
  getDashboardSummary,
  getMenu,
  getMenuCategories,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controller/apiController.js';

import {
  getAddonGroups,
  createAddonGroup,
  updateAddonGroup,
  deleteAddonGroup
} from '../controller/addonController.js';

import {
  getKdsTickets,
  getKdsTicketById,
  createKdsTicket,
  advanceKdsTicket,
  toggleKdsItemCheck,
  deleteKdsTicket
} from '../controller/kdsController.js';

import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  updateCategoryStatus,
  deleteCategory
} from '../controller/categoryController.js';

import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  deleteOrder
} from '../controller/orderController.js';

import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
} from '../controller/customerController.js';

import {
  getTables,
  getTableById,
  createTable,
  updateTableStatus,
  deleteTable
} from '../controller/tableController.js';

import {
  getInventory,
  getLowStockInventory,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem
} from '../controller/inventoryController.js';

import {
  getReports,
  getSaleReport,
  getCustomerReports
} from '../controller/reportController.js';

import {
  getSettings,
  updateSettings,
  resetSettings
} from '../controller/settingsController.js';

import {
  getChatbotSuggestions,
  sendChatbotMessage
} from '../controller/chatbotController.js';

const router = express.Router();

// Health
router.get('/health', getHealthCheck);

// Dashboard
router.get('/dashboard', getDashboardSummary);
router.get('/dashboard/summary', getDashboardSummary);

// Menu
router.get('/menu', getMenu);
router.get('/menu/categories', getMenuCategories);

// Products
router.get('/products', getProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Categories
router.get('/categories', getCategories);
router.get('/categories/:id', getCategoryById);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.put('/categories/:id/status', updateCategoryStatus);
router.delete('/categories/:id', deleteCategory);

// Addons (MongoDB CRUD)
router.get('/addons', getAddonGroups);
router.post('/addons', createAddonGroup);
router.put('/addons/:id', updateAddonGroup);
router.delete('/addons/:id', deleteAddonGroup);

// Inventory
router.get('/inventory', getInventory);
router.get('/inventory/low-stock', getLowStockInventory);
router.get('/inventory/:id', getInventoryItemById);
router.post('/inventory', createInventoryItem);
router.put('/inventory/:id', updateInventoryItem);
router.delete('/inventory/:id', deleteInventoryItem);

// Tables
router.get('/tables', getTables);
router.get('/tables/:id', getTableById);
router.post('/tables', createTable);
router.put('/tables/:id/status', updateTableStatus);
router.delete('/tables/:id', deleteTable);

// KDS
router.get('/kds/tickets', getKdsTickets);
router.get('/kds/tickets/:id', getKdsTicketById);
router.post('/kds/tickets', createKdsTicket);
router.put('/kds/tickets/:id/advance', advanceKdsTicket);
router.put('/kds/tickets/:id/items/:itemId/check', toggleKdsItemCheck);
router.delete('/kds/tickets/:id', deleteKdsTicket);

// Customers
router.get('/customers', getCustomers);
router.get('/customers/:id', getCustomerById);
router.post('/customers', createCustomer);
router.put('/customers/:id', updateCustomer);
router.delete('/customers/:id', deleteCustomer);

// Orders
router.get('/orders', getOrders);
router.get('/orders/:id', getOrderById);
router.post('/orders', createOrder);
router.put('/orders/:id/status', updateOrderStatus);
router.delete('/orders/:id', deleteOrder);

// Reports
router.get('/reports', getReports);
router.get('/reports/sales', getSaleReport);
router.get('/reports/customers', getCustomerReports);

// Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.post('/settings/reset', resetSettings);

// Chatbot
router.get('/chatbot', getChatbotSuggestions);
router.post('/chatbot/message', sendChatbotMessage);

export default router;