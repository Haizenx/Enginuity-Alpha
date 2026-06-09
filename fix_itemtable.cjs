const fs = require('fs');
const file = 'frontend/chat-front-end/src/components/ItemTable.jsx';
let content = fs.readFileSync(file, 'utf8');

// Change Master Material List in QuotationPage
const qPage = 'frontend/chat-front-end/src/pages/QuotationPage.jsx';
let qContent = fs.readFileSync(qPage, 'utf8');
qContent = qContent.replace(/Master Material List/g, 'Materials Master List');
fs.writeFileSync(qPage, qContent);

// Add Pagination to ItemTable.jsx
const tableRewrite = `import React, { useState } from 'react';
import { Edit2, Trash2, Box, ChevronLeft, ChevronRight } from "lucide-react";

const ItemTable = ({ items, onItemDeleted, onItemEdited }) => {
  const [page, setPage] = useState(1);
  const limit = 30;

  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border border-slate-100 rounded-[2rem] text-center w-full">
         <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
            <Box className="w-8 h-8 text-slate-300" />
         </div>
         <p className="text-slate-500 font-medium text-lg">No materials found.</p>
         <p className="text-slate-400 text-sm mt-1">Try adjusting your search or add a new material.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(items.length / limit);
  const currentItems = items.slice((page - 1) * limit, page * limit);

  const handleDeleteTrigger = (itemToDelete) => {
    if (!itemToDelete || !itemToDelete._id) return;
    if (typeof onItemDeleted === 'function') {
      onItemDeleted(itemToDelete); 
    }
  };

  const handleEditTrigger = (item) => {
    if (typeof onItemEdited === 'function') {
      onItemEdited(item);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-[2rem] border border-slate-100 shadow-sm bg-white custom-scrollbar">
        <table className="w-full whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-left">
              <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest rounded-tl-[2rem]">Material Name</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest">Unit of Measure</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-right rounded-tr-[2rem]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentItems.map((item) => {
              if (!item || typeof item._id === 'undefined') return null; 
              return (
                <tr key={item._id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-100/50 group-hover:bg-indigo-100 transition-colors">
                        <Box className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-slate-800 text-base">{item.name || "N/A"}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider border border-slate-200/50">
                      {item.unit || "N/A"}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditTrigger(item)}
                        className="p-2.5 bg-sky-50 text-sky-600 hover:bg-sky-500 hover:text-white rounded-full transition-all shadow-sm"
                        title="Edit Material"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteTrigger(item)}
                        className="p-2.5 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-full transition-all shadow-sm"
                        title="Delete Material"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <span className="text-sm font-medium text-slate-500">
            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, items.length)} of {items.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-bold text-slate-800 px-2">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemTable;
`;

fs.writeFileSync(file, tableRewrite);
console.log('ItemTable rewritten');
