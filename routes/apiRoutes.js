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

import {
  login,
  register,
  getMe
} from '../controller/authController.js';

import {
  purchaseLicense,
  redeemLicense,
  getLicenseStatus,
  getMyLicenses
} from '../controller/licenseController.js';

import {
  protect,
  authorize,
  requireActiveSubscription
} from '../middleware/authMiddleware.js';

const router = express.Router();

// ==========================================
// 1. PUBLIC ROUTES (No Token Required)
// ==========================================
router.get('/health', getHealthCheck);
router.post('/auth/login', login);
router.post('/auth/register', register);
router.post('/license/purchase', purchaseLicense); // Called by Portfolio checkout

// Digital Menu preview (publicly viewable)
router.get('/menu', getMenu);
router.get('/menu/categories', getMenuCategories);

// ==========================================
// 2. AUTHENTICATED ROUTES (Token Required, Even if Expired)
// ==========================================
router.get('/auth/me', protect, getMe);
router.get('/license/status', protect, getLicenseStatus);
router.post('/license/redeem', protect, redeemLicense); // Redeem key to renew when expired
router.get('/license/my-keys', protect, getMyLicenses);

// ==========================================
// 3. FULL SAAS PROTECTED (Token + ACTIVE Subscription Required)
// ==========================================
// Dashboard
router.get('/dashboard', protect, requireActiveSubscription, getDashboardSummary);
router.get('/dashboard/summary', protect, requireActiveSubscription, getDashboardSummary);

// Products
router.get('/products', protect, requireActiveSubscription, getProducts);
router.post('/products', protect, requireActiveSubscription, createProduct);
router.put('/products/:id', protect, requireActiveSubscription, updateProduct);
router.delete('/products/:id', protect, requireActiveSubscription, deleteProduct);

// Categories
router.get('/categories', protect, requireActiveSubscription, getCategories);
router.get('/categories/:id', protect, requireActiveSubscription, getCategoryById);
router.post('/categories', protect, requireActiveSubscription, createCategory);
router.put('/categories/:id', protect, requireActiveSubscription, updateCategory);
router.put('/categories/:id/status', protect, requireActiveSubscription, updateCategoryStatus);
router.delete('/categories/:id', protect, requireActiveSubscription, deleteCategory);

// Addons
router.get('/addons', protect, requireActiveSubscription, getAddonGroups);
router.post('/addons', protect, requireActiveSubscription, createAddonGroup);
router.put('/addons/:id', protect, requireActiveSubscription, updateAddonGroup);
router.delete('/addons/:id', protect, requireActiveSubscription, deleteAddonGroup);

// Inventory
router.get('/inventory', protect, requireActiveSubscription, getInventory);
router.get('/inventory/low-stock', protect, requireActiveSubscription, getLowStockInventory);
router.get('/inventory/:id', protect, requireActiveSubscription, getInventoryItemById);
router.post('/inventory', protect, requireActiveSubscription, createInventoryItem);
router.put('/inventory/:id', protect, requireActiveSubscription, updateInventoryItem);
router.delete('/inventory/:id', protect, requireActiveSubscription, deleteInventoryItem);

// Tables
router.get('/tables', protect, requireActiveSubscription, getTables);
router.get('/tables/:id', protect, requireActiveSubscription, getTableById);
router.post('/tables', protect, requireActiveSubscription, createTable);
router.put('/tables/:id/status', protect, requireActiveSubscription, updateTableStatus);
router.delete('/tables/:id', protect, requireActiveSubscription, deleteTable);

// KDS (Kitchen Display System)
router.get('/kds/tickets', protect, requireActiveSubscription, getKdsTickets);
router.get('/kds/tickets/:id', protect, requireActiveSubscription, getKdsTicketById);
router.post('/kds/tickets', protect, requireActiveSubscription, createKdsTicket);
router.put('/kds/tickets/:id/advance', protect, requireActiveSubscription, advanceKdsTicket);
router.put('/kds/tickets/:id/items/:itemId/check', protect, requireActiveSubscription, toggleKdsItemCheck);
router.delete('/kds/tickets/:id', protect, requireActiveSubscription, deleteKdsTicket);

// Customers
router.get('/customers', protect, requireActiveSubscription, getCustomers);
router.get('/customers/:id', protect, requireActiveSubscription, getCustomerById);
router.post('/customers', protect, requireActiveSubscription, createCustomer);
router.put('/customers/:id', protect, requireActiveSubscription, updateCustomer);
router.delete('/customers/:id', protect, requireActiveSubscription, deleteCustomer);

// Orders & Billing
router.get('/orders', protect, requireActiveSubscription, getOrders);
router.get('/orders/:id', protect, requireActiveSubscription, getOrderById);
router.post('/orders', protect, requireActiveSubscription, createOrder);
router.put('/orders/:id/status', protect, requireActiveSubscription, updateOrderStatus);
router.delete('/orders/:id', protect, requireActiveSubscription, deleteOrder);

// Reports
router.get('/reports', protect, requireActiveSubscription, getReports);
router.get('/reports/sales', protect, requireActiveSubscription, getSaleReport);
router.get('/reports/customers', protect, requireActiveSubscription, getCustomerReports);

// Settings
router.get('/settings', protect, requireActiveSubscription, getSettings);
router.put('/settings', protect, requireActiveSubscription, updateSettings);
router.post('/settings/reset', protect, requireActiveSubscription, resetSettings);

// Chatbot
router.get('/chatbot', protect, requireActiveSubscription, getChatbotSuggestions);
router.post('/chatbot/message', protect, requireActiveSubscription, sendChatbotMessage);

export default router;