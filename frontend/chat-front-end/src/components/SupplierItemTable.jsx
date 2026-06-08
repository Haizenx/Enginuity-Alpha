import React from 'react';
import { Box, Save } from "lucide-react";

const SupplierItemTable = ({
  items,
  priceInputs,
  savingPriceItemId,
  onPriceChange,
  onSave,
}) => {
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border border-slate-100 rounded-[2rem] text-center w-full">
         <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
            <Box className="w-8 h-8 text-slate-300" />
         </div>
         <p className="text-slate-500 font-medium text-lg">No materials found.</p>
         <p className="text-slate-400 text-sm mt-1">Try adjusting your search query.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[2rem] border border-slate-100 shadow-sm bg-white custom-scrollbar">
      <table className="w-full whitespace-nowrap">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100 text-left">
            <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest rounded-tl-[2rem]">Material Name</th>
            <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest">Unit</th>
            <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Supplier Price (₱)</th>
            <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center rounded-tr-[2rem]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => {
            if (!item || typeof item._id === 'undefined') return null;
            return (
              <tr key={item._id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-100/50 group-hover:bg-emerald-100 transition-colors">
                      <Box className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-slate-800 text-base">{item.name || 'Unnamed'}</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className="inline-flex items-center px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider border border-slate-200/50">
                    {item.unit || 'N/A'}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <input
                    type="number"
                    step="0.01"
                    className="bg-white border border-slate-200 text-slate-800 font-bold text-sm rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm w-36 text-right transition-colors hover:border-slate-300"
                    placeholder="0.00"
                    value={priceInputs?.[item._id] ?? ''}
                    onChange={(e) => onPriceChange?.(item._id, e.target.value)}
                  />
                </td>
                <td className="py-4 px-6 text-center">
                  <button
                    onClick={() => onSave?.(item._id)}
                    disabled={savingPriceItemId === item._id}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold tracking-wide text-xs transition-all shadow-sm hover:-translate-y-0.5 hover:shadow-md ${
                      savingPriceItemId === item._id
                        ? 'bg-slate-200 text-slate-500 cursor-wait'
                        : 'bg-emerald-500 text-white hover:bg-emerald-600'
                    }`}
                  >
                    {savingPriceItemId === item._id ? (
                      'Saving...'
                    ) : (
                      <>
                        <Save size={14} strokeWidth={3} /> Save Price
                      </>
                    )}
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
