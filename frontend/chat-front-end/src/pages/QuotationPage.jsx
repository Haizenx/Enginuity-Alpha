/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useCallback, useMemo} from "react";
import axios from "axios";
import toast, { Toaster } from 'react-hot-toast';
import AddItemForm from "../components/AddItemForm"; 
import QuotationForm from "../components/QuotationForm"; 
import ItemTable from "../components/ItemTable";
import SupplierItemTable from "../components/SupplierItemTable";
import EditItemForm from "../components/EditItemForm"; 
import ConfirmationModal from '../components/ConfirmationModal'; 
import { fetchSuppliers, createSupplier, setItemSupplierPrice, updateSupplier, deleteSupplier } from "../services/supplierService"; 

const QuotationPage = () => {
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState("materials");
  const [showAddForm, setShowAddForm] = useState(false); 
  const [showQuoteForm, setShowQuoteForm] = useState(false); 
  const [itemSearchTerm, setItemSearchTerm] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [currentItemToEdit, setCurrentItemToEdit] = useState(null);

  const [isLoading, setIsLoading] = useState({ list: false, action: false });
  const [error, setError] = useState({ list: null, action: null });

  // --- Suppliers State ---
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [newSupplier, setNewSupplier] = useState({ name: "", contactEmail: "", address: "", contactNumber: "" });
  const [savingPriceItemId, setSavingPriceItemId] = useState("");
  const [isEditingSupplier, setIsEditingSupplier] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState(null);
  const [supplierItemSearchTerm, setSupplierItemSearchTerm] = useState("");
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false); 

  // --- Modal State ---
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalAction, setModalAction] = useState(null);
  // const [modalData, setModalData] = useState(null);
  const [modalContent, setModalContent] = useState({ title: '', message: '', confirmText: 'Confirm' });

  const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5001/api'
    : 'https://enginuity-alpha.onrender.com/api';

  const currentSupplier = useMemo(() => {
    return suppliers.find(s => s._id === selectedSupplierId);
  }, [suppliers, selectedSupplierId]);

  const fetchItems = useCallback(async () => {
    setIsLoading(prev => ({ ...prev, list: true }));
    setError(prev => ({ ...prev, list: null }));
    try {
      const res = await axios.get(`${API_BASE_URL}/items`);
      if (Array.isArray(res.data)) {
        setItems(res.data.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
      } else {
        setItems([]);
      }
    } catch (err) {
      setError(prev => ({ ...prev, list: err.response?.data?.message || "Could not load items." }));
      setItems([]);
    } finally {
      setIsLoading(prev => ({ ...prev, list: false }));
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const loadSuppliers = useCallback(async () => {
    try {
      const list = await fetchSuppliers();
      setSuppliers(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("Failed to load suppliers", e);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const currentPriceForItem = useCallback((item) => {
    if (!item || !Array.isArray(item.supplierPrices) || !selectedSupplierId) return "";
    const match = item.supplierPrices.find(sp => String(sp.supplier) === String(selectedSupplierId));
    return match ? match.price : "";
  }, [selectedSupplierId]);

  const [priceInputs, setPriceInputs] = useState({});
  useEffect(() => {
    const next = {};
    items.forEach(it => { next[it._id] = currentPriceForItem(it) || ""; });
    setPriceInputs(next);
  }, [items, selectedSupplierId, currentPriceForItem]);
  
  const hasUnsavedPriceChanges = useMemo(() => {
    if (!selectedSupplierId) return false;
    return items.some(item => {
      const originalPrice = currentPriceForItem(item) || "";
      const currentInput = priceInputs[item._id] || "";
      return String(originalPrice) !== String(currentInput);
    });
  }, [items, priceInputs, selectedSupplierId, currentPriceForItem]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (isEditing || isEditingSupplier || hasUnsavedPriceChanges) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isEditing, isEditingSupplier, hasUnsavedPriceChanges]);

  const handleAddItemTrigger = (itemPayload) => {
    // setModalData({ itemPayload });
    setModalAction(() => () => executeAddItem(itemPayload)); 
    setModalContent({
      title: "Confirm Add Item",
      message: `Are you sure you want to add the item "${itemPayload.name}"?`,
      confirmText: "Add Item"
    });
    setShowConfirmModal(true);
  };

  const executeAddItem = async (itemPayload) => {
    setIsLoading(prev => ({ ...prev, action: true }));
    setError(prev => ({ ...prev, action: null }));
    try {
      await axios.post(`${API_BASE_URL}/items`, itemPayload);
      toast.success(`Item "${itemPayload.name}" added successfully!`);
      fetchItems(); 
      setShowAddForm(false); 
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to add item.';
      toast.error(errorMessage);
      setError(prev => ({ ...prev, action: errorMessage }));
    } finally {
      setIsLoading(prev => ({ ...prev, action: false }));
    }
  };

  const handleOpenEditForm = (item) => {
    setCurrentItemToEdit(item);
    setIsEditing(true);
    setShowAddForm(false); 
    setShowQuoteForm(false);
    setIsEditingSupplier(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setCurrentItemToEdit(null);
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    if (!newSupplier.name.trim() || !newSupplier.contactNumber.trim()) {
        toast.error("Supplier Name and Contact Phone Number are required.");
        return;
    }
    
    const payload = {
        name: newSupplier.name.trim(),
        contactEmail: newSupplier.contactEmail.trim(),
        address: newSupplier.address.trim(),
        contactNumber: newSupplier.contactNumber.trim(),
    };

    try {
      await createSupplier(payload);
      toast.success(`Supplier "${payload.name}" created.`);
      setNewSupplier({ name: "", contactEmail: "", address: "", contactNumber: "" });
      await loadSuppliers();
      setShowAddSupplierModal(false);
    } catch (e) {
      toast.error("Failed to create supplier.");
    }
  };

  const handleDeleteSupplierTrigger = (supplier) => {
    // setModalData(supplier);
    setModalAction(() => () => executeDeleteSupplier(supplier._id));
    setModalContent({
      title: "Confirm Delete Supplier",
      message: `Are you sure you want to delete the supplier "${supplier.name}"? This action cannot be undone.`,
      confirmText: "Delete Supplier",
      confirmButtonClass: 'btn-error'
    });
    setShowConfirmModal(true);
  };

  const executeDeleteSupplier = async (supplierId) => {
    setIsLoading(prev => ({ ...prev, action: true }));
    try {
      await deleteSupplier(supplierId);
      toast.success("Supplier deleted successfully.");
      await loadSuppliers();
      if (selectedSupplierId === supplierId) {
        setSelectedSupplierId("");
      }
    } catch (e) {
      toast.error("Failed to delete supplier.");
    } finally {
      setIsLoading(prev => ({ ...prev, action: false }));
    }
  };

  const handleOpenEditSupplier = (supplier) => {
    setSupplierToEdit({ ...supplier });
    setIsEditingSupplier(true);
    setShowAddForm(false); 
    setIsEditing(false);
    setShowQuoteForm(false);
  };

  const handleSaveEditedSupplier = async (e) => {
    e.preventDefault();
    if (!supplierToEdit || !supplierToEdit.name.trim() || !supplierToEdit.contactNumber.trim()) {
        toast.error("Supplier Name and Contact Phone Number are required.");
        return;
    }
    setIsLoading(prev => ({ ...prev, action: true }));
    try {
      await updateSupplier(supplierToEdit._id, { 
          name: supplierToEdit.name, 
          contactEmail: supplierToEdit.contactEmail,
          address: supplierToEdit.address,
          contactNumber: supplierToEdit.contactNumber,
        });
      toast.success("Supplier updated successfully.");
      setIsEditingSupplier(false);
      setSupplierToEdit(null);
      await loadSuppliers();
    } catch (e) {
      toast.error("Failed to update supplier.");
    } finally {
      setIsLoading(prev => ({ ...prev, action: false }));
    }
  };

  const handlePriceInputChange = (itemId, value) => {
    setPriceInputs(prev => ({ ...prev, [itemId]: value }));
  };

  const handleSaveSupplierPrice = async (itemId) => {
    const val = parseFloat(priceInputs[itemId]);
    if (isNaN(val) || val < 0) { toast.error("Enter a valid non-negative price"); return; }
    try {
      setSavingPriceItemId(itemId);
      await setItemSupplierPrice(itemId, { supplierId: selectedSupplierId, price: val });
      toast.success("Price saved successfully!");
      await fetchItems();
    } catch (e) {
      toast.error("Failed to save price.");
    } finally {
      setSavingPriceItemId("");
    }
  };

  const handleSaveSupplierPriceTrigger = (itemId) => {
    const val = parseFloat(priceInputs[itemId]);
    if (isNaN(val) || val < 0) { toast.error("Enter a valid non-negative price"); return; }
    const it = items.find(x => x && x._id === itemId);
    // setModalData({ itemId, price: val });
    setModalAction(() => () => handleSaveSupplierPrice(itemId));
    setModalContent({
      title: "Confirm Save Supplier Price",
      message: `Save price ₱${val.toFixed(2)} for item "${it?.name || 'Unnamed'}"?`,
      confirmText: "Save Price"
    });
    setShowConfirmModal(true);
  };

  const handleUpdateItemTrigger = (itemPayload, itemId) => {
    // setModalData({ itemPayload, itemId });
    setModalAction(() => () => executeUpdateItem(itemPayload, itemId)); 
    setModalContent({
      title: "Confirm Update Item",
      message: `Are you sure you want to update the item "${itemPayload.name}"?`,
      confirmText: "Update Item"
    });
    setShowConfirmModal(true);
  };

  const executeUpdateItem = async (itemPayload, itemId) => {
    setIsLoading(prev => ({ ...prev, action: true }));
    setError(prev => ({ ...prev, action: null }));
    try {
      await axios.put(`${API_BASE_URL}/items/${itemId}`, itemPayload);
      toast.success("Item updated successfully!");
      fetchItems(); 
      handleCancelEdit(); 
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to update item.';
      toast.error(errorMessage);
      setError(prev => ({ ...prev, action: errorMessage }));
    } finally {
      setIsLoading(prev => ({ ...prev, action: false }));
    }
  };

  const handleDeleteItemTrigger = (itemToDelete) => {
    if (!itemToDelete || !itemToDelete._id) {
        toast.error("Cannot delete item due to missing information.");
        return;
    }
    // setModalData(itemToDelete); 
    setModalAction(() => () => executeDeleteItem(itemToDelete._id)); 
    setModalContent({
      title: "Confirm Delete Item",
      message: `Are you sure you want to delete the item "${itemToDelete.name}"? This action cannot be undone.`,
      confirmText: "Delete Item",
      confirmButtonClass: 'btn-error'
    });
    setShowConfirmModal(true);
  };

  const executeDeleteItem = async (itemId) => {
    setIsLoading(prev => ({ ...prev, action: true }));
    setError(prev => ({ ...prev, action: null }));
    try {
      await axios.delete(`${API_BASE_URL}/items/${itemId}`);
      toast.success("Item deleted successfully.");
      await fetchItems();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to delete item.';
      toast.error(errorMessage);
      setError(prev => ({ ...prev, action: errorMessage }));
    } finally {
      setIsLoading(prev => ({ ...prev, action: false }));
    }
  };

  const displayedItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    if (!itemSearchTerm.trim()) return items;
    const searchTermLower = itemSearchTerm.toLowerCase();
    return items.filter(item =>
      (item.name || "").toLowerCase().includes(searchTermLower) ||
      (item.unit || "").toLowerCase().includes(searchTermLower) 
    );
  }, [items, itemSearchTerm]); 

  const displayedSupplierItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    if (!supplierItemSearchTerm.trim()) return items;
    const searchTermLower = supplierItemSearchTerm.toLowerCase();
    return items.filter(item =>
      (item.name || "").toLowerCase().includes(searchTermLower) ||
      (item.unit || "").toLowerCase().includes(searchTermLower)
    );
  }, [items, supplierItemSearchTerm]);

  const handleModalConfirm = () => {
    if (typeof modalAction === 'function') {
      modalAction(); 
    }
    setShowConfirmModal(false);
    setModalAction(null); 
    // setModalData(null);   
  };

  const handleModalClose = () => {
    setShowConfirmModal(false);
    setModalAction(null); 
    // setModalData(null);   
  };

  return (
    <main className="min-h-screen w-full bg-slate-50/50 relative py-12 px-4 sm:px-6 lg:px-8 pb-32">
      <Toaster position="top-center" reverseOrder={false} />
      
      {/* Ambient Background Blobs */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-200/40 rounded-full blur-[120px] mix-blend-multiply pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-sky-200/40 rounded-full blur-[120px] mix-blend-multiply pointer-events-none" />

      <div className="max-w-[1400px] mx-auto relative z-10">
        
        {/* Header Section */}
        <div className="mb-8 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight mb-4">Quotation System</h1>
          <p className="text-lg text-slate-500 max-w-2xl font-medium leading-relaxed">
            Manage your master list of materials, track supplier pricing, and instantly generate professional PDF quotations for your clients.
          </p>
        </div>
  
        {/* Tab Navigation */}
        <div className="flex flex-col sm:flex-row gap-2 mb-8 bg-white/60 p-2 rounded-2xl backdrop-blur-md border border-white shadow-sm inline-flex">
          <button
            onClick={() => setActiveTab('materials')}
            className={`px-6 py-3 rounded-xl font-bold tracking-wide text-sm transition-all shadow-sm ${
              activeTab === 'materials' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            Master Materials
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-6 py-3 rounded-xl font-bold tracking-wide text-sm transition-all shadow-sm ${
              activeTab === 'suppliers' 
                ? 'bg-emerald-500 text-white shadow-md' 
                : 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            Supplier Management
          </button>
          <button
            onClick={() => setActiveTab('quotation')}
            className={`px-6 py-3 rounded-xl font-bold tracking-wide text-sm transition-all shadow-sm ${
              activeTab === 'quotation' 
                ? 'bg-sky-500 text-white shadow-md' 
                : 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            Quotation Wizard
          </button>
        </div>

        {/* Dynamic Forms Area (Appears on top if editing or adding in Materials Tab) */}
        {activeTab === 'materials' && (
          <div className="space-y-6 mb-8">
            <div className="flex justify-end mb-4">
               <button
                onClick={() => { setShowAddForm(prev => !prev); setIsEditing(false); }}
                className={`px-6 py-3 rounded-full font-bold tracking-wide text-sm flex items-center justify-center transition-all shadow-sm hover:-translate-y-0.5 hover:shadow-md border ${
                  showAddForm && !isEditing 
                    ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200' 
                    : 'bg-indigo-600 text-white border-transparent hover:bg-indigo-700'
                }`}
              >
                {showAddForm && !isEditing ? "Cancel Add Item" : "+ Add New Material"}
              </button>
            </div>
            {isEditing && currentItemToEdit && (
              <div className="bg-amber-50/80 backdrop-blur-md p-8 rounded-[2rem] border border-amber-200/50 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                <h2 className="text-2xl font-black text-amber-800 tracking-tight mb-6">Edit Material</h2>
                <EditItemForm
                  key={currentItemToEdit._id} 
                  itemToEdit={currentItemToEdit}
                  onItemUpdateTrigger={handleUpdateItemTrigger} 
                  onCancelEdit={handleCancelEdit}
                  isSubmitting={isLoading.action}
                />
              </div>
            )}
            
            {showAddForm && !isEditing && (
              <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                <h2 className="text-2xl font-black text-indigo-900 tracking-tight mb-6">Add New Material</h2>
                <AddItemForm
                  onAddItemSubmitTrigger={handleAddItemTrigger} 
                  isSubmitting={isLoading.action}
                  onBulkItemsAdded={fetchItems}
                />
              </div>
            )}
          </div>
        )}

        {/* Tab 1: Master Materials List */}
        {activeTab === 'materials' && (
           <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-shadow animate-in fade-in duration-500">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
               <div className="flex items-center gap-3">
                 <div className="w-1.5 h-8 bg-indigo-400 rounded-full"></div>
                 <h2 className="text-3xl font-black text-slate-800 tracking-tight">Materials Master List</h2>
               </div>
               
               <div className="relative w-full md:w-72 group">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                   <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                 </div>
                 <input
                   type="text"
                   placeholder="Search master list..."
                   value={itemSearchTerm}
                   onChange={(e) => setItemSearchTerm(e.target.value)}
                   className="bg-slate-50 border border-slate-200 text-slate-800 font-medium text-sm rounded-full py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm w-full transition-all group-hover:border-slate-300 group-hover:bg-white"
                 />
               </div>
             </div>
             
             {!isLoading.list && !error.list ? (
               <ItemTable
                 items={displayedItems}
                 onItemEdited={handleOpenEditForm} 
                 onItemDeleted={handleDeleteItemTrigger}
               />
             ) : (
               <div className="flex flex-col items-center justify-center py-20">
                  {isLoading.list ? (
                    <>
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                      <p className="text-slate-500 font-medium">Loading materials...</p>
                    </>
                  ) : (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-2xl shadow-sm flex items-center gap-3">
                      <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <span className="font-semibold">{error.list}</span>
                    </div>
                  )}
               </div>
             )}
           </div>
        )}

        {/* Tab 2: Supplier Management */}
        {activeTab === 'suppliers' && (
          <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-shadow mb-12 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-8 bg-emerald-400 rounded-full"></div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Supplier Management</h2>
              </div>
              <button
                onClick={() => setShowAddSupplierModal(true)}
                className="px-6 py-3 rounded-full font-bold tracking-wide text-sm flex items-center justify-center transition-all shadow-sm hover:-translate-y-0.5 hover:shadow-md bg-emerald-500 text-white border-transparent hover:bg-emerald-600 w-full md:w-auto"
              >
                + Add New Supplier
              </button>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-end gap-4 mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <div className="w-full md:w-auto flex-1 max-w-md">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Select Supplier</label>
                <select
                  className="bg-white border border-slate-200 text-slate-800 font-medium text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm w-full cursor-pointer hover:border-slate-300 transition-colors"
                  value={selectedSupplierId}
                  onChange={(e) => {
                    setSelectedSupplierId(e.target.value);
                    setIsEditingSupplier(false);
                    setSupplierItemSearchTerm("");
                  }}
                >
                  <option value="">-- Choose a supplier --</option>
                  {suppliers.map(s => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>
              
              {selectedSupplierId && (
                <div className="flex gap-2 w-full md:w-auto">
                  <button 
                    className="px-6 py-3 rounded-xl font-bold tracking-wide text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex-1 md:flex-none"
                    onClick={() => handleOpenEditSupplier(suppliers.find(s => s._id === selectedSupplierId))}
                  >
                    Edit Profile
                  </button>
                  <button 
                    className="px-6 py-3 rounded-xl font-bold tracking-wide text-sm bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white transition-colors flex-1 md:flex-none"
                    onClick={() => handleDeleteSupplierTrigger(suppliers.find(s => s._id === selectedSupplierId))}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
            
            {currentSupplier && !isEditingSupplier && (
              <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-3xl mb-8 shadow-inner">
                <h3 className="text-xl font-bold text-emerald-800 mb-4 tracking-tight">{currentSupplier.name} Profile</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                   <div>
                     <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Email</p>
                     <p className="text-slate-700 font-medium">{currentSupplier.contactEmail || 'N/A'}</p>
                   </div>
                   <div>
                     <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Phone</p>
                     <p className="text-slate-700 font-medium">{currentSupplier.contactNumber || 'N/A'}</p>
                   </div>
                   <div className="sm:col-span-2 lg:col-span-1">
                     <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Address</p>
                     <p className="text-slate-700 font-medium">{currentSupplier.address || 'N/A'}</p>
                   </div>
                </div>
              </div>
            )}

            {isEditingSupplier && supplierToEdit && (
              <div className="bg-amber-50/80 border border-amber-200/50 p-6 rounded-3xl mb-8 shadow-inner animate-in fade-in">
                <h3 className="text-xl font-bold text-amber-800 mb-4 tracking-tight">Edit Supplier Profile</h3>
                <form onSubmit={handleSaveEditedSupplier} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={supplierToEdit.name ?? ''}
                    onChange={(e) => setSupplierToEdit(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Supplier Name *"
                    className="bg-white border border-amber-100 text-slate-800 font-medium text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none shadow-sm w-full"
                    required
                  />
                  <input
                    type="text"
                    value={supplierToEdit.contactNumber ?? ''}
                    onChange={(e) => setSupplierToEdit(prev => ({ ...prev, contactNumber: e.target.value }))}
                    placeholder="Contact Number *"
                    className="bg-white border border-amber-100 text-slate-800 font-medium text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none shadow-sm w-full"
                    required
                  />
                  <input
                    type="email"
                    value={supplierToEdit.contactEmail ?? ''}
                    onChange={(e) => setSupplierToEdit(prev => ({ ...prev, contactEmail: e.target.value }))}
                    placeholder="Email Address (Optional)"
                    className="bg-white border border-amber-100 text-slate-800 font-medium text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none shadow-sm w-full"
                  />
                  <input
                    type="text"
                    value={supplierToEdit.address ?? ''}
                    onChange={(e) => setSupplierToEdit(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Physical Address (Required)" required
                    className="bg-white border border-amber-100 text-slate-800 font-medium text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none shadow-sm w-full"
                  />
                  <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                    <button type="button" className="px-6 py-2.5 rounded-xl font-bold tracking-wide text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors" onClick={() => setIsEditingSupplier(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="px-6 py-2.5 rounded-xl font-bold tracking-wide text-sm bg-amber-500 text-white hover:bg-amber-600 transition-all shadow-sm" disabled={isLoading.action}>
                      {isLoading.action ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {selectedSupplierId ? (
              <div className="mt-8 border-t border-slate-100 pt-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <h3 className="text-xl font-bold text-slate-800 tracking-tight">Set Material Prices</h3>
                  <div className="relative w-full md:w-72 group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search pricing list..."
                      value={supplierItemSearchTerm} 
                      onChange={(e) => setSupplierItemSearchTerm(e.target.value)} 
                      className="bg-slate-50 border border-slate-200 text-slate-800 font-medium text-sm rounded-full py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm w-full transition-all group-hover:border-slate-300 group-hover:bg-white"
                    />
                  </div>
                </div>
                
                <SupplierItemTable
                  items={displayedSupplierItems} 
                  priceInputs={priceInputs}
                  savingPriceItemId={savingPriceItemId}
                  onPriceChange={handlePriceInputChange}
                  onSave={handleSaveSupplierPriceTrigger}
                />
              </div>
            ) : (
              <div className="mt-8 border-t border-slate-100 pt-10 pb-4 text-center">
                 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                 </div>
                 <p className="text-slate-500 font-medium text-lg">Select a supplier to manage pricing.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Create Quotation */}
        {activeTab === 'quotation' && (
          <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-sky-100 shadow-sm animate-in fade-in duration-500">
            <h2 className="text-3xl font-black text-sky-900 tracking-tight mb-8">Quotation Wizard</h2>
            <QuotationForm items={items} projectDetails={null} onBulkItemsAdded={fetchItems} /> 
          </div>
        )}

      </div>

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={handleModalClose}
        onConfirm={handleModalConfirm}
        title={modalContent.title}
        message={modalContent.message}
        confirmText={modalContent.confirmText}
        confirmButtonClass={modalContent.confirmButtonClass}
      />
          
      {showAddSupplierModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] shadow-2xl p-8 w-full max-w-md border border-slate-100 scale-in-center">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">New Supplier</h3>
                </div>
                
                <form onSubmit={handleCreateSupplier} className="space-y-4">
                    <div>
                      <input
                          type="text"
                          value={newSupplier.name ?? ''}
                          onChange={(e) => setNewSupplier(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Supplier Name *"
                          className="bg-slate-50 border border-slate-200 text-slate-800 font-medium text-sm rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm w-full focus:bg-white transition-colors"
                          required
                      />
                    </div>
                    <div>
                      <input
                          type="text"
                          value={newSupplier.contactNumber ?? ''}
                          onChange={(e) => setNewSupplier(prev => ({ ...prev, contactNumber: e.target.value }))}
                          placeholder="Contact Phone Number *"
                          className="bg-slate-50 border border-slate-200 text-slate-800 font-medium text-sm rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm w-full focus:bg-white transition-colors"
                          required
                      />
                    </div>
                    <div>
                      <input
                          type="email"
                          value={newSupplier.contactEmail ?? ''}
                          onChange={(e) => setNewSupplier(prev => ({ ...prev, contactEmail: e.target.value }))}
                          placeholder="Email Address (Optional)"
                          className="bg-slate-50 border border-slate-200 text-slate-800 font-medium text-sm rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm w-full focus:bg-white transition-colors"
                      />
                    </div>
                    <div>
                      <input
                          type="text"
                          value={newSupplier.address ?? ''}
                          onChange={(e) => setNewSupplier(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="Physical Address (Required)" required
                          className="bg-slate-50 border border-slate-200 text-slate-800 font-medium text-sm rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm w-full focus:bg-white transition-colors"
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-2">
                        <button 
                            type="button" 
                            className="px-6 py-3 rounded-xl font-bold tracking-wide text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors" 
                            onClick={() => setShowAddSupplierModal(false)}
                            disabled={isLoading.action}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="px-6 py-3 rounded-xl font-bold tracking-wide text-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-sm" 
                            disabled={isLoading.action}
                        >
                            {isLoading.action ? 'Adding...' : 'Add Supplier'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </main>
  );
};

export default QuotationPage;
