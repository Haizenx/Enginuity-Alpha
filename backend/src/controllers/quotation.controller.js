import Quotation from "../models/quotation.model.js";
import Item from "../models/item.model.js";
import Supplier from "../models/supplier.model.js";

export const createQuotation = async (req, res) => {
  try {
    const { projectTitle, clientName, location, items } = req.body;
    const quotation = new Quotation({ projectTitle, clientName, location, items });
    await quotation.save();
    res.status(201).json(quotation);
  } catch (error) {
    console.error("Error creating quotation:", error);
    res.status(500).json({ message: "Failed to create quotation", error: error.message });
  }
};

export const getQuotations = async (req, res) => {
  try {
    const quotations = await Quotation.find().populate({
      path: 'items.item',
      model: 'Item'
    });
    res.json(quotations);
  } catch (error) {
    console.error("Error fetching quotations:", error);
    res.status(500).json({ message: "Failed to fetch quotations", error: error.message });
  }
};

export const getQuotationById = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id).populate({
      path: 'items.item',
      model: 'Item'
    });
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    res.json(quotation);
  } catch (error) {
    console.error("Error fetching quotation:", error);
    res.status(500).json({ message: "Failed to fetch quotation", error: error.message });
  }
};

export const compareQuotationPrices = async (req, res) => {
  try {
    const { items } = req.body; // [{ itemId, quantity }]
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items array is required" });
    }

    const itemDocs = await Item.find({ _id: { $in: items.map(i => i.itemId) } }).populate('supplierPrices.supplier');
    const itemIdToQty = new Map(items.map(i => [String(i.itemId), Number(i.quantity) || 0]));

    const supplierTotals = new Map(); // supplierId -> { supplier, total }

    itemDocs.forEach(doc => {
      const qty = itemIdToQty.get(String(doc._id)) || 0;
      doc.supplierPrices.forEach(sp => {
        const key = String(sp.supplier._id);
        const prev = supplierTotals.get(key) || { supplier: sp.supplier, total: 0 };
        prev.total += (sp.price || 0) * qty;
        supplierTotals.set(key, prev);
      });
    });

    const results = Array.from(supplierTotals.values()).sort((a, b) => a.total - b.total);
    const best = results[0] || null;

    res.json({ results, best });
  } catch (error) {
    console.error("Error in compareQuotationPrices:", error);
    res.status(500).json({ message: "Failed to compare prices", error: error.message });
  }
};

