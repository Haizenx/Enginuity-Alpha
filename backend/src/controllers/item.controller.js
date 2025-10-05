import Item from "../models/item.model.js";
import Supplier from "../models/supplier.model.js";

// Helper function to escape special characters for use in a regular expression
const escapeRegex = (text) => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

export const getItems = async (req, res) => {
  try {
    const items = await Item.find().sort({ name: 1 });
    res.status(200).json(items);
  } catch (error) {
    console.error("Error in getItems:", error);
    res.status(500).json({ message: "Failed to fetch items", error: error.message });
  }
};

export const addItem = async (req, res) => {
  try {
    const { name, unit, materialCost, laborCost } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Item name is required." });
    }

    // --- THIS IS THE FIX ---
    // We escape the name before creating the search pattern
    const escapedName = escapeRegex(name.trim());
    const searchPattern = new RegExp('^' + escapedName + '$', 'i');
    // ----------------------

    const item = await Item.findOneAndUpdate(
      { name: searchPattern }, // Use the safe, escaped search pattern
      {
        $setOnInsert: {
          name: name.trim(),
          unit: unit?.trim() || '',
          materialCost: materialCost || 0,
          laborCost: laborCost || 0
        }
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );
    res.status(200).json(item);
  } catch (error) {
    console.error("Error in addItem (upsert):", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: "Validation failed", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to process item", error: error.message });
  }
};

export const getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.status(200).json(item);
  } catch (error) {
    console.error("Error in getItemById:", error);
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ message: "Invalid item ID format" });
    }
    res.status(500).json({ message: "Failed to fetch item", error: error.message });
  }
};

export const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, unit, materialCost, laborCost } = req.body;
     if (!name || !unit) {
        return res.status(400).json({ message: "Name and Unit are required for update." });
    }
    const updateData = {
      name,
      unit,
      materialCost: materialCost || 0,
      laborCost: laborCost || 0
    };
    const updatedItem = await Item.findByIdAndUpdate(id, updateData, {
      new: true, runValidators: true,
    });
    if (!updatedItem) {
      return res.status(404).json({ message: "Item not found for update" });
    }
    res.status(200).json({ message: "Item updated successfully", item: updatedItem });
  } catch (error) {
    console.error("Error in updateItem:", error);
     if (error.name === 'ValidationError') {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
    }
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ message: "Invalid item ID format for update" });
    }
    res.status(500).json({ message: "Failed to update item", error: error.message });
  }
};

export const setSupplierPrice = async (req, res) => {
  try {
    const { id } = req.params; // item id
    const { supplierId, price, currency } = req.body;
    if (!supplierId || price == null) {
      return res.status(400).json({ message: "supplierId and price are required" });
    }
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });

    const item = await Item.findById(id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    const existing = item.supplierPrices.find(sp => sp.supplier.toString() === supplierId);
    if (existing) {
      existing.price = price;
      if (currency) existing.currency = currency;
    } else {
      item.supplierPrices.push({ supplier: supplierId, price, currency: currency || 'PHP' });
    }
    await item.save();
    await item.populate('supplierPrices.supplier');
    res.json(item);
  } catch (error) {
    console.error("Error in setSupplierPrice:", error);
    res.status(500).json({ message: "Failed to set supplier price", error: error.message });
  }
};

export const getItemSupplierPrices = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Item.findById(id).populate('supplierPrices.supplier');
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item.supplierPrices || []);
  } catch (error) {
    console.error("Error in getItemSupplierPrices:", error);
    res.status(500).json({ message: "Failed to fetch supplier prices", error: error.message });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedItem = await Item.findByIdAndDelete(id);
    if (!deletedItem) {
      return res.status(404).json({ message: "Item not found for deletion" });
    }
    res.status(200).json({ message: "Item deleted successfully", itemId: id });
  } catch (error) {
    console.error("Error in deleteItem:", error);
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ message: "Invalid item ID format for delete" });
    }
    res.status(500).json({ message: "Failed to delete item", error: error.message });
  }
};