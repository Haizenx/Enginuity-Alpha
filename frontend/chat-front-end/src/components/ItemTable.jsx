// src/components/ItemTable.js
import React from 'react';
// Removed axios import, as API calls are handled by the parent (QuotationPage.jsx)

const ItemTable = ({ items, onItemDeleted }) => {
  // Check if items is not an array or is empty
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div className="text-center text-gray-500 mt-8 py-4">
        No items to display. Add some items using the form above.
      </div>
    );
  }

  // This function is now simplified. It just calls the prop passed from the parent.
  // The parent (QuotationPage.jsx) will handle the confirmation modal and the API call.
  const handleDeleteTrigger = (itemToDelete) => {
    if (!itemToDelete || !itemToDelete._id) {
      console.error("Delete trigger aborted: Item object or Item ID is undefined or null.");
      alert("Cannot delete item: Item information is missing.");
      return;
    }
    
    // Call the prop passed from QuotationPage.jsx, which will show the custom modal
    if (typeof onItemDeleted === 'function') {
      console.log(`ItemTable: Calling onItemDeleted (trigger) for item:`, itemToDelete);
      onItemDeleted(itemToDelete); 
    } else {
      console.warn("WARNING: onItemDeleted prop is not provided as a function to ItemTable.");
      alert("Delete functionality is not properly configured.");
    }
  };

  // Edit action removed; items list is add/delete only

  return (
    <div className="overflow-x-auto mt-8 shadow-xl rounded-lg">
      <table className="min-w-full bg-white">
        <thead className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
          <tr>
            <th className="py-3 px-6 text-left">Name</th>
            <th className="py-3 px-6 text-left">Unit</th>
            <th className="py-3 px-6 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="text-gray-600 text-sm font-light">
          {items.map((item) => {
            if (!item || typeof item._id === 'undefined') {
              console.warn("ItemTable: Item is missing or does not have an _id. Skipping render:", item);
              return null; 
            }
            return (
              <tr key={item._id} className="border-b border-gray-200 hover:bg-gray-100">
                <td className="py-3 px-6 text-left whitespace-nowrap">{item.name || "N/A"}</td>
                <td className="py-3 px-6 text-left">{item.unit || "N/A"}</td>
                <td className="py-3 px-6 text-center whitespace-nowrap">
                  <button
                    onClick={() => handleDeleteTrigger(item)}
                    className="text-xs bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-full focus:outline-none focus:shadow-outline"
                  >
                    Delete
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

export default ItemTable;