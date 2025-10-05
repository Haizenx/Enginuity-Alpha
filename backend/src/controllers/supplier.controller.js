import Supplier from "../models/supplier.model.js";

export const createSupplier = async (req, res) => {
  try {
    const supplier = new Supplier(req.body);
    await supplier.save();
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ message: "Failed to create supplier", error: error.message });
  }
};

export const getSuppliers = async (_req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch suppliers", error: error.message });
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const updated = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Supplier not found" });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update supplier", error: error.message });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    const deleted = await Supplier.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Supplier not found" });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete supplier", error: error.message });
  }
};


