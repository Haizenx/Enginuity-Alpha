// src/components/SupplierItemTable.jsx
import React from 'react';

const SupplierItemTable = ({
  items,
  priceInputs,
  savingPriceItemId,
  onPriceChange,
  onSave,
}) => {
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div className="text-center text-gray-500 mt-8 py-4">
        No items available.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto mt-8 shadow-xl rounded-lg">
      <table className="min-w-full bg-white">
        <thead className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
          <tr>
            <th className="py-3 px-6 text-left">Name</th>
            <th className="py-3 px-6 text-left">Unit</th>
            <th className="py-3 px-6 text-right">Supplier Price</th>
            <th className="py-3 px-6 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="text-gray-600 text-sm font-light">
          {items.map((item) => {
            if (!item || typeof item._id === 'undefined') return null;
            return (
              <tr key={item._id} className="border-b border-gray-200 hover:bg-gray-100">
                <td className="py-3 px-6 text-left">{item.name || 'Unnamed'}</td>
                <td className="py-3 px-6 text-left">{item.unit || 'N/A'}</td>
                <td className="py-3 px-6 text-right">
                  <input
                    type="number"
                    step="0.01"
                    className="input input-bordered input-sm w-36"
                    value={priceInputs?.[item._id] ?? ''}
                    onChange={(e) => onPriceChange?.(item._id, e.target.value)}
                  />
                </td>
                <td className="py-3 px-6 text-center whitespace-nowrap">
                  <button
                    onClick={() => onSave?.(item._id)}
                    disabled={savingPriceItemId === item._id}
                    className={`text-xs text-white py-1 px-3 rounded-full focus:outline-none focus:shadow-outline ${
                      savingPriceItemId === item._id
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-indigo-500 hover:bg-indigo-600'
                    }`}
                  >
                    {savingPriceItemId === item._id ? 'Saving...' : 'Save'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default SupplierItemTable;



