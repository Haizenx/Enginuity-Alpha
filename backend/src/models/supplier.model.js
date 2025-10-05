import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  contactEmail: { type: String, trim: true },
  contactNumber: { type: String, trim: true },
  address: { type: String, trim: true }
}, { timestamps: true });

const Supplier = mongoose.model("Supplier", supplierSchema);

export default Supplier;
