import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import InventoryItem from '../models/InventoryItem.js';
import Table from '../models/Table.js';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import Settings from '../models/Settings.js';

dotenv.config();

const seedData = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/restaurant360';

  await mongoose.connect(mongoUri);

  await Promise.all([
    Product.deleteMany(),
    Category.deleteMany(),
    InventoryItem.deleteMany(),
    Table.deleteMany(),
    Customer.deleteMany(),
    Order.deleteMany(),
    Settings.deleteMany()
  ]);

  const categories = await Category.insertMany([
    { name: 'Food', color: 'None', description: 'Food dishes and meals', active: true },
    { name: 'Beverages', color: 'None', description: 'Hot & cold drinks', active: true },
    { name: 'Starters', color: 'Orange', description: 'Starters and appetizers', active: true }
  ]);

  await Product.insertMany([
    { name: 'Meal', initials: 'ME', badgeColor: '#84cc16', category: categories[0]._id, active: true, price: 250 },
    { name: 'Tea', initials: 'TE', badgeColor: '#84cc16', category: categories[1]._id, active: true, price: 40 },
    { name: 'Coffee', initials: 'CO', badgeColor: '#14b8a6', category: categories[1]._id, active: true, price: 80 },
    { name: 'Snack', initials: 'SN', badgeColor: '#14b8a6', category: categories[0]._id, active: true, price: 120 },
    { name: 'Paneer Tikka', initials: 'PT', badgeColor: '#f97316', category: categories[2]._id, active: true, price: 280 }
  ]);

  await InventoryItem.insertMany([
    { sku: 'ING-001', item: 'Tomato', category: 'Vegetables', stock: 32, reorderLevel: 15, unit: 'kg' },
    { sku: 'ING-002', item: 'Onion', category: 'Vegetables', stock: 28, reorderLevel: 20, unit: 'kg' },
    { sku: 'ING-003', item: 'Paneer', category: 'Dairy', stock: 12, reorderLevel: 10, unit: 'kg' },
    { sku: 'ING-004', item: 'Rice', category: 'Grains', stock: 9, reorderLevel: 12, unit: 'kg' }
  ]);

  await Table.insertMany([
  // Ground Floor
  {
    tableId: 'T1',
    floor: 'Ground Floor',
    seats: 4,
    status: 'available'
  },
  {
    tableId: 'T2',
    floor: 'Ground Floor',
    seats: 4,
    status: 'available'
  },
  {
    tableId: 'T3',
    floor: 'Ground Floor',
    seats: 4,
    status: 'occupied'
  },
  {
    tableId: 'T4',
    floor: 'Ground Floor',
    seats: 8,
    status: 'available'
  },
  {
    tableId: 'T5',
    floor: 'Ground Floor',
    seats: 2,
    status: 'available'
  },
  {
    tableId: 'T6',
    floor: 'Ground Floor',
    seats: 4,
    status: 'available'
  },

  // First Floor
  {
    tableId: 'T7',
    floor: 'First Floor',
    seats: 4,
    status: 'available'
  },
  {
    tableId: 'T8',
    floor: 'First Floor',
    seats: 4,
    status: 'reserved'
  },
  {
    tableId: 'T9',
    floor: 'First Floor',
    seats: 6,
    status: 'available'
  },

  // Terrace
  {
    tableId: 'T10',
    floor: 'Terrace',
    seats: 4,
    status: 'available'
  },
  {
    tableId: 'T11',
    floor: 'Terrace',
    seats: 6,
    status: 'available'
  },

  // VIP
  {
    tableId: 'V1',
    floor: 'VIP Cabin',
    seats: 6,
    status: 'available'
  },
  {
    tableId: 'V2',
    floor: 'VIP Cabin',
    seats: 8,
    status: 'available'
  }
]);

  await Customer.insertMany([
    { name: 'Riya Sharma', loyalty: 'Gold', totalSpent: 8450, visits: 18 },
    { name: 'Aman Verma', loyalty: 'Silver', totalSpent: 5320, visits: 11 },
    { name: 'Mehul Patel', loyalty: 'Platinum', totalSpent: 12050, visits: 21 }
  ]);

  await Order.insertMany([
    { orderId: 'ORD-1001', table: 'Table 1', total: 1460, status: 'Preparing', itemsCount: 4 },
    { orderId: 'ORD-1002', table: 'Table 4', total: 980, status: 'Served', itemsCount: 3 }
  ]);

  await Settings.create({
    branchName: 'Restaurant360 - Main Branch',
    taxRate: 5,
    currency: 'INR',
    printerEnabled: true,
    autoPrintKOT: true,
    enableLoyalty: true,
    theme: 'dark'
  });

  console.log('Seed data inserted successfully');
  process.exit(0);
};

seedData().catch((error) => {
  console.error('Seed error:', error);
  process.exit(1);
});
