// src/components/EditItemForm.js
import React, { useState, useEffect } from 'react';
// Removed axios import, parent will handle API call

const EditItemForm = ({ itemToEdit, onItemUpdateTrigger, onCancelEdit, isSubmitting }) => { // Renamed onItemUpdated
  const [item, setItem] = useState({
    name: '',
    unit: '',
    materialCost: '',
    laborCost: ''
  });
  const [error, setError] = useState(null);
  // Success state is removed, parent will handle success feedback

  useEffect(() => {
    if (itemToEdit) {
      setItem({
        name: itemToEdit.name || '',
        unit: itemToEdit.unit || '',
        materialCost: itemToEdit.materialCost != null ? String(itemToEdit.materialCost) : '0',
        laborCost: itemToEdit.laborCost != null ? String(itemToEdit.laborCost) : '0'
      });
      setError(null); // Clear error when form repopulates
    }
  }, [itemToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setItem(prevItem => ({ ...prevItem, [name]: value }));
  };

  const handleSubmit = (e) => { // Renamed from original handleSubmit
    e.preventDefault();
    setError(null);

    if (!itemToEdit || !itemToEdit._id) {
      setError("No item ID available for update.");
      return;
    }
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

    if (onItemUpdateTrigger) {
      onItemUpdateTrigger(payload, itemToEdit._id); // Trigger parent to show modal and handle submission
    } else {
      console.error("EditItemForm: onItemUpdateTrigger prop is missing!");
    }
  };

  if (!itemToEdit) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-4 rounded-2xl shadow-sm flex items-center gap-3">
          <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span className="font-semibold">{error}</span>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="edit-item-name" className="block text-xs font-bold text-amber-600 uppercase tracking-wider mb-2 ml-1">Item Name *</label>
          <input
            type="text" id="edit-item-name" name="name" value={item.name} onChange={handleChange} required
            className="bg-white border border-amber-200 text-slate-800 font-medium text-sm rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-amber-500 outline-none shadow-sm w-full transition-colors"
          />
        </div>
        <div>
          <label htmlFor="edit-item-unit" className="block text-xs font-bold text-amber-600 uppercase tracking-wider mb-2 ml-1">Unit *</label>
          <input
            type="text" id="edit-item-unit" name="unit" value={item.unit} onChange={handleChange} required
            className="bg-white border border-amber-200 text-slate-800 font-medium text-sm rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-amber-500 outline-none shadow-sm w-full transition-colors"
          />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          type="button" onClick={onCancelEdit}
          disabled={isSubmitting}
          className="px-6 py-3.5 rounded-xl font-bold tracking-wide text-sm bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors flex-1"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-sm tracking-wide disabled:opacity-50 disabled:hover:translate-y-0 flex-[2]"
        >
          {isSubmitting ? "Saving Changes..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
};

export default EditItemForm;
