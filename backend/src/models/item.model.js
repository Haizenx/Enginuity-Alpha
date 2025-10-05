// models/item.model.js
import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  unit: {
    type: String,
    required: true,
    trim: true,
  },
  materialCost: {
    type: Number,
    required: false, // Or true, depending on your needs
    default: 0,
  },
  laborCost: {
    type: Number,
    required: false, // Or true
    default: 0,
  },
  // --- Adjust these fields ---
  category: {
    type: String,
    trim: true,
    default: 'Uncategorized', // Or remove default if you prefer null/undefined
  },
  itemNo: {
    type: String,
    trim: true,
    default: null, // Explicitly default to null or remove default
  }
  // --- End of adjustments ---
  ,
  supplierPrices: [
    {
      supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
      price: { type: Number, required: true },
      currency: { type: String, default: 'PHP' }
    }
  ]
}, { timestamps: true }); // Adds createdAt and updatedAt

const Item = mongoose.model('Item', itemSchema);

export default Item;