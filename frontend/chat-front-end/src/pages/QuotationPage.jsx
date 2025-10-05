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
  const [modalData, setModalData] = useState(null);
  const [modalContent, setModalContent] = useState({ title: '', message: '', confirmText: 'Confirm' });

  const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5001/api'
    : 'https://enguinity-9.onrender.com/api';

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
    setModalData({ itemPayload });
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
    setModalData(supplier);
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
    setModalData({ itemId, price: val });
    setModalAction(() => () => handleSaveSupplierPrice(itemId));
    setModalContent({
      title: "Confirm Save Supplier Price",
      message: `Save price ₱${val.toFixed(2)} for item "${it?.name || 'Unnamed'}"?`,
      confirmText: "Save Price"
    });
    setShowConfirmModal(true);
  };

  const handleUpdateItemTrigger = (itemPayload, itemId) => {
    setModalData({ itemPayload, itemId });
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
    setModalData(itemToDelete); 
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
    setModalData(null);   
  };

  const handleModalClose = () => {
    setShowConfirmModal(false);
    setModalAction(null); 
    setModalData(null);   
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 pt-10 md:pt-20 px-4 pb-20">
      <Toaster position="top-center" reverseOrder={false} />
      <div className="bg-white rounded-xl shadow-2xl p-6 md:p-10 w-full max-w-6xl">
        <h1 className="text-4xl font-extrabold mb-8 text-center text-indigo-700">Construction Quotation System</h1>
  
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
          <button
            onClick={() => { setShowAddForm(prev => !prev); setIsEditing(false); setShowQuoteForm(false); setCurrentItemToEdit(null); setIsEditingSupplier(false); }}
            className={`btn ${showAddForm && !isEditing ? 'btn-active btn-neutral' : 'btn-primary'}`}
          >
            {showAddForm && !isEditing ? "Close Item Form" : "Add New Item"}
          </button>
          <button
            onClick={() => { setShowQuoteForm(prev => !prev); setShowAddForm(false); setIsEditing(false); setCurrentItemToEdit(null); setIsEditingSupplier(false); }}
            className={`btn ${showQuoteForm ? 'btn-active btn-neutral' : 'btn-secondary'}`}
          >
            {showQuoteForm ? "Close Quotation Form" : "Make Quotation"}
          </button>
          <button
            onClick={() => setShowAddSupplierModal(true)}
            className="btn btn-info"
          >
            Add New Supplier
          </button>
        </div>

        {isEditing && currentItemToEdit && (
          <div className="my-6 p-6 border border-yellow-300 rounded-lg bg-yellow-50 shadow-md">
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
          <div className="my-6 p-6 border border-green-300 rounded-lg bg-green-50 shadow-md">
            <AddItemForm
              onAddItemSubmitTrigger={handleAddItemTrigger} 
              isSubmitting={isLoading.action}
              onBulkItemsAdded={fetchItems}
            />
          </div>
        )}
        
        {showQuoteForm && (
          <div className="my-6 p-6 border border-blue-300 rounded-lg bg-blue-50 shadow-md">
             <h2 className="text-2xl font-semibold mb-4 text-gray-700">Create PDF Quotation</h2>
            <QuotationForm items={items} projectDetails={null} onBulkItemsAdded={fetchItems} /> 
          </div>
        )}

        <div className="my-10 p-6 border border-indigo-300 rounded-lg bg-white shadow-xl">
          <h2 className="text-2xl font-extrabold mb-6 text-indigo-700">Supplier Management & Pricing</h2>

          <div className="mb-6 flex flex-col md:flex-row items-start md:items-end gap-4">
            <div>
              <label className="label">
                <span className="label-text font-medium">Select Supplier for Pricing</span>
              </label>
              <select
                className="select select-bordered w-full md:w-64 border-indigo-400"
                value={selectedSupplierId}
                onChange={(e) => {
                  setSelectedSupplierId(e.target.value);
                  setIsEditingSupplier(false);
                  setSupplierItemSearchTerm("");
                }}
              >
                <option value="">-- Choose or Add a supplier --</option>
                {suppliers.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>
            
            {selectedSupplierId && (
              <div className="flex gap-2">
                <button 
                  className="btn btn-sm btn-outline btn-info"
                  onClick={() => handleOpenEditSupplier(suppliers.find(s => s._id === selectedSupplierId))}
                >
                  Edit
                </button>
                <button 
                  className="btn btn-sm btn-outline btn-error"
                  onClick={() => handleDeleteSupplierTrigger(suppliers.find(s => s._id === selectedSupplierId))}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
          
          {currentSupplier && !isEditingSupplier && (

 <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6 shadow-sm">

 <h3 className="text-xl font-bold text-blue-700 mb-2">{currentSupplier.name} Details</h3>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">

                      <p><strong>Email:</strong> {currentSupplier.contactEmail || 'N/A'}</p>

                      <p><strong>Phone:</strong> {currentSupplier.contactNumber || 'N/A'}</p>

                      <p className="sm:col-span-2"><strong>Address:</strong> {currentSupplier.address || 'N/A'}</p>

                  </div>

              </div>

          )}



          {isEditingSupplier && supplierToEdit && (
            <div className="border p-4 rounded-lg bg-orange-50 mb-6 border-orange-300">
              <h3 className="font-semibold text-lg mb-2 text-orange-700">Edit Supplier: {supplierToEdit.name}</h3>
              <form onSubmit={handleSaveEditedSupplier} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={supplierToEdit.name ?? ''}
                  onChange={(e) => setSupplierToEdit(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Supplier Name (required)"
                  className="input input-bordered w-full"
                  required
                />
                <input
                  type="text"
                  value={supplierToEdit.contactNumber ?? ''}
                  onChange={(e) => setSupplierToEdit(prev => ({ ...prev, contactNumber: e.target.value }))}
                  placeholder="Contact Phone Number (required)"
                  className="input input-bordered w-full"
                  required
                />
                <input
                  type="email"
                  value={supplierToEdit.contactEmail ?? ''}
                  onChange={(e) => setSupplierToEdit(prev => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="Contact Email (optional)"
                  className="input input-bordered w-full"
                />
                <input
                  type="text"
                  value={supplierToEdit.address ?? ''}
                  onChange={(e) => setSupplierToEdit(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Supplier Address (optional)"
                  className="input input-bordered w-full"
                />
                <div className="md:col-span-2 flex gap-2">
                  <button type="submit" className="btn btn-success flex-1" disabled={isLoading.action}>
                    {isLoading.action ? 'Updating...' : 'Save Changes'}
                  </button>
                  <button type="button" className="btn btn-outline btn-neutral" onClick={() => setIsEditingSupplier(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {selectedSupplierId ? (
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4 text-gray-700">Set Prices for Selected Supplier</h3>
              
              <div className="flex justify-end mb-4">
                <input
                  type="text"
                  placeholder="Search material name or unit..."
                  value={supplierItemSearchTerm} 
                  onChange={(e) => setSupplierItemSearchTerm(e.target.value)} 
                  className="input input-bordered w-full md:max-w-xs"
                />
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
            <p className="text-md text-gray-600 border-t pt-4">Select a supplier from the dropdown above to view and set their item prices.</p>
          )}
        </div>

       <div className="mt-10">
          <div className="flex flex-col md:flex-row justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-700 mb-3 md:mb-0">Available Items Master List</h2>
            
            <input
              type="text"
              placeholder="Search master list items (name/unit)..."
              value={itemSearchTerm}
              onChange={(e) => setItemSearchTerm(e.target.value)}
              className="input input-bordered input-sm w-full md:max-w-xs"
            />
          </div>
          
          {!isLoading.list && !error.list ? (
            <ItemTable
              items={displayedItems}
              onItemEdited={handleOpenEditForm} 
              onItemDeleted={handleDeleteItemTrigger}
            />
          ) : (
            <p className="text-center py-4">{isLoading.list ? "Loading items..." : error.list}</p>
          )}
        </div>
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
                <h3 className="text-2xl font-bold mb-4 text-indigo-700">Add New Supplier</h3>
                <form onSubmit={handleCreateSupplier} className="grid grid-cols-1 gap-3">
                    <input
                        type="text"
                        value={newSupplier.name ?? ''}
                        onChange={(e) => setNewSupplier(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Supplier Name (required)"
                        className="input input-bordered w-full"
                        required
                    />
                    <input
                        type="text"
                        value={newSupplier.contactNumber ?? ''}
                        onChange={(e) => setNewSupplier(prev => ({ ...prev, contactNumber: e.target.value }))}
                        placeholder="Contact Phone Number (required)"
                        className="input input-bordered w-full"
                        required
                    />
                    <input
                        type="email"
                        value={newSupplier.contactEmail ?? ''}
                        onChange={(e) => setNewSupplier(prev => ({ ...prev, contactEmail: e.target.value }))}
                        placeholder="Contact Email (optional)"
                        className="input input-bordered w-full"
                    />
                    <input
                        type="text"
                        value={newSupplier.address ?? ''}
                        onChange={(e) => setNewSupplier(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Supplier Address (optional)"
                        className="input input-bordered w-full"
                    />
                    <div className="flex justify-end gap-2 pt-4">
                        <button 
                            type="button" 
                            className="btn btn-ghost" 
                            onClick={() => setShowAddSupplierModal(false)}
                            disabled={isLoading.action}
                        >
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isLoading.action}>
                            {isLoading.action ? 'Adding...' : 'Add Supplier'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default QuotationPage;