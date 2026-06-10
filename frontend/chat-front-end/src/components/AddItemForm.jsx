// src/components/AddItemForm.jsx
import React, { useState, useEffect } from "react";
import ConfirmationModal from './ConfirmationModal';
import Papa from 'papaparse'; // Assumes you have run 'npm install papaparse'
import { axiosInstance } from "../lib/axios";

// --- CSV Parsing Function (using PapaParse) ---
const parseCSV = (file) => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const items = results.data.map(row => ({
                    // Map common header variations to standardized names
                    name: (row.name || row.Name || row.item || row.Item || '').trim(), 
                    unit: (row.unit || row.Unit || '').trim(),
                    price: (row.price || row.Price || row.cost || row.Cost || '').trim()
                })).filter(item => item.name); // Filter out rows missing a name
                
                resolve(items);
            },
            error: (error) => {
                reject(new Error("Error parsing CSV: " + error.message));
            }
        });
    });
};
// ---------------------------------------------

const AddItemForm = ({ onAddItemSubmitTrigger, isSubmitting, onBulkItemsAdded }) => { 
  const [item, setItem] = useState({
    name: "",
    unit: "",
    materialCost: "",
    laborCost: ""
  });
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setItem({ ...item, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (!item.name.trim() || !item.unit.trim()) {
        setError("Item Name and Unit are required.");
        return;
    }
    const matCost = parseFloat(item.materialCost);
    const labCost = parseFloat(item.laborCost);

    if (item.materialCost.trim() !== "" && (isNaN(matCost) || matCost < 0)) {
        setError("Material Cost must be a valid non-negative number if provided.");
        return;
    }
    if (item.laborCost.trim() !== "" && (isNaN(labCost) || labCost < 0)) {
        setError("Labor Cost must be a valid non-negative number if provided.");
        return;
    }

    const payload = {
      name: item.name.trim(),
      unit: item.unit.trim(),
      materialCost: matCost || 0,
      laborCost: labCost || 0,
    };

    if (onAddItemSubmitTrigger) {
      onAddItemSubmitTrigger(payload);
    } else {
      console.error("AddItemForm: onAddItemSubmitTrigger prop is missing!");
    }
  };

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [confirmContent, setConfirmContent] = useState({ title: 'Confirm Upload', message: '', confirmText: 'Proceed' });
  const [previewItems, setPreviewItems] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState(""); 

  // Lazy load suppliers
  useEffect(() => {
    const load = async () => {
      try {
        const res = await axiosInstance.get(`/suppliers`);
        const data = res.data;
        setSuppliers(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  const handleFileUpload = async (file) => {
    setUploadError("");
    setPreviewItems([]);
    if (!file) return;
    
    try {
      setIsUploading(true);
      const items = await parseCSV(file); 
      
      if (items.length === 0) { 
        setUploadError(`No valid items detected in file: ${file.name}. Ensure columns "name", "unit", "price" exist.`); 
        return; 
      }
      
      setPreviewItems(items.map(r => ({
        name: String(r?.name || '').trim(),
        unit: String(r?.unit || '').trim(),
        price: (r?.price != null && !isNaN(Number(r.price))) ? Number(r.price) : ''
      })));
      setUploadedFileName(file.name);
    } catch (e) {
      console.error("CSV Upload Error:", e);
      setUploadError(e.message || 'CSV processing failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChosen = (file) => {
    if (!file) return;
    setPendingFile(file);
    const supplierName = suppliers.find(s => s._id === selectedSupplierId)?.name || 'NONE SELECTED';
    setConfirmContent({
      title: 'Confirm Bulk CSV Upload',
      message: `File: ${file.name}\nPrices will be saved for supplier: ${supplierName}.\n\nContinue to process the CSV data?`,
      confirmText: 'Yes, Process CSV'
    });
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    const file = pendingFile;
    setShowConfirm(false);
    setPendingFile(null);
    if (file) {
      await handleFileUpload(file);
    }
  };

  const handlePreviewChange = (idx, field, value) => {
    setPreviewItems(prev => prev.map((row, i) => {
        if (i === idx) {
            return { ...row, [field]: (field === 'price' && value !== '') ? Number(value) : value };
        }
        return row;
    }));
  };

  const handleRemovePreviewRow = (idx) => {
    setPreviewItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveAllPreview = async () => {
    if (previewItems.length === 0) return;
    const API_BASE_URL = window.location.hostname === 'localhost' 
      ? 'http://localhost:5001/api'
      : 'https://enguinity-9.onrender.com/api';
    try {
      setIsSaving(true);
      let successCount = 0;
      let errorCount = 0;

      for (const row of previewItems) {
        const payload = {
          name: String(row.name || '').trim(),
          unit: String(row.unit || '').trim(),
          materialCost: 0,
          laborCost: 0,
        };
        if (!payload.name) { errorCount++; continue; }
        
        try {
            // 1. Create/Update Item
            const createdRes = await axiosInstance.post(`/items`, payload);
            const created = createdRes.data;
            const createdId = created?._id || created?.id;
            successCount++;

            // 2. Add Supplier Price
            const priceVal = Number(row.price);
            if (selectedSupplierId && createdId && !isNaN(priceVal) && priceVal >= 0) {
                await axiosInstance.post(`/items/${createdId}/supplier-price`, { supplierId: selectedSupplierId, price: priceVal });
            }
        } catch (err) {
            console.error(`Error saving item ${row.name}:`, err);
            errorCount++;
        }
      }
      
      const finalMessage = `Bulk save complete! ${successCount} items processed successfully. ${errorCount} items failed or were skipped (missing name).`;
      alert(finalMessage);
      
      setPreviewItems([]);
      setUploadedFileName("");
      
      // Trigger parent component to refresh master item list
      if (onBulkItemsAdded) {
        onBulkItemsAdded();
      }

    } catch (e) {
      console.error("Final Save Error:", e);
      alert('A major error occurred during final save. Check console for details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">{error}</div>}
      
      {/* --- Manual Add Section --- */}
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Manual Item Entry</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="add-item-name" className="label-text">Item Name</label>
          <input type="text" id="add-item-name" name="name" value={item.name} onChange={handleChange} required className="input input-bordered w-full" />
        </div>

        <div>
          <label htmlFor="add-item-unit" className="label-text">Unit</label>
          <input type="text" id="add-item-unit" name="unit" value={item.unit} onChange={handleChange} required className="input input-bordered w-full" />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full btn btn-primary mt-2"
      >
        {isSubmitting ? "Submitting..." : "Add Item to Master List"}
      </button>

      <div className="divider">OR</div>

      {/* --- Bulk Add Section (NON-AI CSV) --- */}
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">📄 Bulk Upload Price List (CSV)</h3>
      {uploadError && <div className="p-3 mb-2 text-sm text-red-700 bg-red-100 rounded-lg">{uploadError}</div>}

      <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div>
            <label className="label-text block">Select Supplier (for prices)</label>
            <select className="select select-bordered w-full" value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)} disabled={isUploading}>
              <option value="">-- NO SUPPLIER SELECTED (Only items added) --</option>
              {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <label className="btn btn-success flex-nowrap" disabled={isUploading}>
            📤
            <input 
              type="file" 
              accept=".csv"
              className="hidden" 
              onChange={async (e) => { 
                const f = e.target.files?.[0]; 
                if (f) {
                  setUploadError("");
                  await handleFileChosen(f); 
                }
              }} 
              disabled={isUploading} 
            />
            {isUploading ? (<> Processing... ⏳ </>) : 'Upload CSV Price List'}
          </label>
        </div>
        
        <p className="text-xs text-gray-600">
            Upload a CSV file with columns: **name, unit, price**. 
        </p>
      </div>


      {/* --- Preview Table --- */}
      {previewItems.length > 0 && (
        <div className="mt-6 border border-blue-400 rounded-lg shadow-lg overflow-hidden">
          <div className="px-4 py-3 bg-blue-100 font-bold text-blue-800 flex justify-between items-center">
            <span>📝 CSV Extracted Items ({previewItems.length}) - Review and Edit</span>
            <span className="text-sm font-normal text-gray-600">Source: {uploadedFileName}</span>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="min-w-full bg-white divide-y divide-gray-200">
              <thead className="sticky top-0 bg-gray-200 text-gray-700 text-sm">
                <tr>
                  <th className="py-2 px-3 text-left w-1/2">Name (Required)</th>
                  <th className="py-2 px-3 text-left w-1/6">Unit</th>
                  <th className="py-2 px-3 text-right w-1/6">Supplier Price (₱)</th>
                  <th className="py-2 px-3 text-center w-1/6">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-100">
                {previewItems.map((row, idx) => (
                  <tr key={idx} className="hover:bg-yellow-50">
                    <td className="py-2 px-3">
                      <input value={row.name} onChange={(e) => handlePreviewChange(idx, 'name', e.target.value)} className="input input-bordered input-sm w-full" placeholder="Enter Item Name" />
                    </td>
                    <td className="py-2 px-3">
                      <input value={row.unit} onChange={(e) => handlePreviewChange(idx, 'unit', e.target.value)} className="input input-bordered input-sm w-full" placeholder="Unit" />
                    </td>
                    <td className="py-2 px-3 text-right">
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₱</span>
                          <input type="number" step="0.01" value={row.price} onChange={(e) => handlePreviewChange(idx, 'price', e.target.value)} className="input input-bordered input-sm w-full text-right pl-6" placeholder="0.00" />
                        </div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button type="button" className="btn btn-xs btn-error" onClick={() => handleRemovePreviewRow(idx)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-gray-100 flex justify-end">
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveAllPreview} disabled={isSaving || previewItems.length === 0}>
              {isSaving ? (<> Saving All... ⏳</>) : (<>💾 Save All Items to Database</>)}
            </button>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => { setShowConfirm(false); setPendingFile(null); }}
        onConfirm={handleConfirm}
        title={confirmContent.title}
        message={confirmContent.message}
        confirmText={confirmContent.confirmText}
      />
    </form>
  );
};

export default AddItemForm;
