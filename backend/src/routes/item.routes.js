// item.route.js
import express from 'express';
// Import your controller functions
import {
  getItems,
  addItem,
  getItemById, // Good to have for fetching a single item, e.g., for an edit form prefill
  updateItem,
  deleteItem,
  setSupplierPrice,
  getItemSupplierPrices
} from '../controllers/item.controller.js'; // Make sure this path is correct

const router = express.Router();

// GET all items
// Uses the getItems controller function
router.get('/', getItems);

// POST a new item
// Uses the addItem controller function
router.post('/', addItem);

// GET a single item by ID
// Uses the getItemById controller function
router.get('/:id', getItemById);

// PUT (update) an item by ID
// Uses the updateItem controller function
router.put('/:id', updateItem);

// DELETE an item by ID
// Uses the deleteItem controller function
router.delete('/:id', deleteItem);

// Supplier pricing for an item
router.post('/:id/supplier-price', setSupplierPrice);
router.get('/:id/supplier-prices', getItemSupplierPrices);

export default router;