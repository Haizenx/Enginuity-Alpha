/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useMemo } from "react";
import { compareQuotation } from "../services/quotationService";
import toast from "react-hot-toast";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ConfirmationModal from './ConfirmationModal';
import { fetchSuppliers } from "../services/supplierService";

// --- Font Embedding (Optional) ---
const NOTO_SANS_REGULAR_BASE64 = ""; // Leave empty or remove if not embedding

const QuotationForm = ({ items, projectDetails: initialProjectDetails, initialSupplierId, onBulkItemsAdded }) => {
  const [quantities, setQuantities] = useState({});
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  
  const [activePercentages, setActivePercentages] = useState({ 1: 5, 2: 10, 3: 15 });
  const [editedPercentages, setEditedPercentages] = useState({ 1: 5, 2: 10, 3: 15 });
  const [selectedClientLevel, setSelectedClientLevel] = useState('1');

  const [showActionConfirmModal, setShowActionConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [pendingActionConfig, setPendingActionConfig] = useState({ title: '', message: '', confirmText: 'Confirm', cancelText: 'Cancel' });

  // Load saved percentages from localStorage on initial component mount
  useEffect(() => {
    try {
      const savedPercentages = localStorage.getItem('clientLevelPercentages');
      if (savedPercentages) {
        const parsed = JSON.parse(savedPercentages);
        setActivePercentages(parsed);
        setEditedPercentages(parsed);
      }
    } catch (error) {
      console.error("Failed to parse saved percentages from localStorage", error);
    }
  }, []);

  // Pre-fill quantities if autoAddQuotationItems is present
  useEffect(() => {
    const autoAdd = localStorage.getItem('autoAddQuotationItems');
    if (autoAdd && Array.isArray(items) && items.length > 0) {
      try {
        const parsedQuantities = JSON.parse(autoAdd);
        if (Object.keys(parsedQuantities).length > 0) {
          setQuantities(parsedQuantities);
          toast.success("Items from AI Analysis added successfully!", { duration: 3000 });
        }
      } catch (e) {
        console.error("Failed to parse autoAddQuotationItems", e);
      }
      localStorage.removeItem('autoAddQuotationItems');
    }
  }, [items]);

  useEffect(() => {
    if (initialSupplierId && suppliers.length > 0) {
      // Validate that the supplier exists
      const exists = suppliers.some(s => s._id === initialSupplierId);
      if (exists) {
         setSelectedSupplierId(initialSupplierId);
      }
    }
  }, [initialSupplierId, suppliers]);

  const defaultProjectDetails = {
    projectTitle: 'Sample Project Title',
    projectOwner: 'Client Name',
    location: 'Project Location',
    projectDuration: '30-45 Days',
    reportDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  };

  const [currentQuotationProjectDetails, setCurrentQuotationProjectDetails] = useState(() => {
    const startingDetails = { ...defaultProjectDetails };
    if (initialProjectDetails) {
      if (initialProjectDetails.projectTitle !== undefined) startingDetails.projectTitle = initialProjectDetails.projectTitle;
      if (initialProjectDetails.projectOwner !== undefined) startingDetails.projectOwner = initialProjectDetails.projectOwner;
      if (initialProjectDetails.location !== undefined) startingDetails.location = initialProjectDetails.location;
      if (initialProjectDetails.projectDuration !== undefined) startingDetails.projectDuration = initialProjectDetails.projectDuration;
      if (initialProjectDetails.reportDate !== undefined) startingDetails.reportDate = initialProjectDetails.reportDate;
    }
    return startingDetails;
  });

  useEffect(() => {
    if (initialProjectDetails) {
      setCurrentQuotationProjectDetails(prevDetails => {
        const newDetails = { ...defaultProjectDetails, ...prevDetails, ...initialProjectDetails };
        newDetails.projectTitle = initialProjectDetails.projectTitle !== undefined ? initialProjectDetails.projectTitle : prevDetails.projectTitle;
        newDetails.projectOwner = initialProjectDetails.projectOwner !== undefined ? initialProjectDetails.projectOwner : prevDetails.projectOwner;
        newDetails.location = initialProjectDetails.location !== undefined ? initialProjectDetails.location : prevDetails.location;
        newDetails.projectDuration = initialProjectDetails.projectDuration !== undefined ? initialProjectDetails.projectDuration : prevDetails.projectDuration;
        newDetails.reportDate = initialProjectDetails.reportDate !== undefined ? initialProjectDetails.reportDate : prevDetails.reportDate;
        return newDetails;
      });
    }
  }, [initialProjectDetails]);

  const handleProjectDetailsChange = (e) => {
    const { name, value } = e.target;
    setCurrentQuotationProjectDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleQuantityChange = (itemId, amount) => {
    setQuantities((prev) => ({
      ...prev,
      [itemId]: Math.max(0, (parseInt(prev[itemId], 10) || 0) + amount),
    }));
  };

  const handleInputChange = (itemId, value) => {
    const num = parseInt(value, 10);
    setQuantities((prev) => ({
      ...prev,
      [itemId]: isNaN(num) || num < 0 ? "" : num,
    }));
  };
  
  const handlePercentageChange = (level, value) => {
    const num = Math.max(0, parseFloat(value) || 0);
    setEditedPercentages(prev => ({
        ...prev,
        [level]: isNaN(num) ? '' : num
    }));
  };

  const handleSaveSettings = () => {
    setActivePercentages(editedPercentages);
    localStorage.setItem('clientLevelPercentages', JSON.stringify(editedPercentages));
    alert('Percentage settings have been saved!');
  };

  const handleCancelSettings = () => {
    setEditedPercentages(activePercentages);
  };

  const areSettingsUnsaved = useMemo(() => {
    return JSON.stringify(activePercentages) !== JSON.stringify(editedPercentages);
  }, [activePercentages, editedPercentages]);

  const [quotationSearchTerm, setQuotationSearchTerm] = useState("");
  const [quotationSortAscending, setQuotationSortAscending] = useState(true);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareResult, setCompareResult] = useState(null);

  const handleQuotationSearchChange = (e) => {
    setQuotationSearchTerm(e.target.value);
  };

  const toggleQuotationSortDirection = () => {
    setQuotationSortAscending(prev => !prev);
  };

  const displayableItemsForSelection = useMemo(() => {
    let filteredAndSorted = Array.isArray(items) ? [...items] : [];
    if (quotationSearchTerm.trim() !== "") {
      filteredAndSorted = filteredAndSorted.filter(item =>
        item && item.name && typeof item.name === 'string' && item.name.toLowerCase().includes(quotationSearchTerm.toLowerCase())
      );
    }
    filteredAndSorted.sort((a, b) => {
      const nameA = (a.name || "").toLowerCase();
      const nameB = (b.name || "").toLowerCase();
      if (nameA < nameB) return quotationSortAscending ? -1 : 1;
      if (nameA > nameB) return quotationSortAscending ? 1 : -1;
      return 0;
    });
    return filteredAndSorted;
  }, [items, quotationSearchTerm, quotationSortAscending]);

  useEffect(() => {
    const load = async () => {
      try { setLoadingSuppliers(true); const list = await fetchSuppliers(); setSuppliers(Array.isArray(list) ? list : []); }
      catch (e) { console.error(e); }
      finally { setLoadingSuppliers(false); }
    };
    load();
  }, []);

  const getSupplierPriceForItem = (item) => {
    if (!selectedSupplierId || !item) return null;
    const offers = Array.isArray(item.supplierPrices) ? item.supplierPrices : [];
    const match = offers.find(o => String(o.supplier) === String(selectedSupplierId));
    return (match && match.price != null) ? Number(match.price) : null;
  };

  const getFinalUnitPriceForItem = (item) => {
    const basePrice = getSupplierPriceForItem(item);
    if (basePrice === null) return null;
    const percentage = activePercentages[selectedClientLevel] || 0;
    const laborCost = basePrice * (percentage / 100);
    return basePrice + laborCost;
  };

  const supplierTotal = useMemo(() => {
    if (!selectedSupplierId) return 0;
    let total = 0;
    (items || []).forEach(item => {
      if (!item || !item._id) return;
      const qty = parseInt(quantities[item._id], 10) || 0;
      if (qty > 0) {
        const finalPrice = getFinalUnitPriceForItem(item);
        if (finalPrice !== null) {
          total += finalPrice * qty;
        }
      }
    });
    return total;
  }, [items, quantities, selectedSupplierId, selectedClientLevel, activePercentages]);

  // CHANGE: Updated the on-screen estimate calculation to include labor cost breakdown
  const selectedItemsForEstimate = useMemo(() => {
    if (!selectedSupplierId || !Array.isArray(items)) return [];
    return items
      .filter(it => it && it._id && (parseInt(quantities[it._id], 10) || 0) > 0)
      .map((it, idx) => {
        const qty = parseInt(quantities[it._id], 10) || 0;
        const basePrice = getSupplierPriceForItem(it) ?? 0;
        const percentage = activePercentages[selectedClientLevel] || 0;
        const laborCost = basePrice * (percentage / 100);
        const finalUnitPrice = basePrice + laborCost;
        const amount = finalUnitPrice * qty;
        return {
          no: idx + 1,
          name: it.description || it.name || 'N/A',
          unit: it.unit || 'pc',
          qty,
          basePrice,
          laborCost,
          amount,
        };
      });
  }, [items, quantities, selectedSupplierId, selectedClientLevel, activePercentages]);

  const computedTotalForUI = useMemo(() => {
    return selectedSupplierId ? supplierTotal : 0;
  }, [selectedSupplierId, supplierTotal]);

  const hasAnyQuantity = useMemo(() => {
    return Object.values(quantities).some((q) => (parseInt(q, 10) || 0) > 0);
  }, [quantities]);

  const selectedItemsPayload = useMemo(() => {
    const payload = [];
    if (!Array.isArray(items)) return payload;
    items.forEach(item => {
      const qty = parseInt(quantities[item._id], 10) || 0;
      if (qty > 0) payload.push({ itemId: item._id, quantity: qty });
    });
    return payload;
  }, [items, quantities]);
  
  const itemsMissingPrice = useMemo(() => {
    if (!selectedSupplierId) return [];
    const missing = [];
    items.forEach(item => {
      const quantity = parseInt(quantities[item._id], 10) || 0;
      if (quantity > 0) {
        const price = getSupplierPriceForItem(item);
        if (price === null) {
          missing.push(item.name);
        }
      }
    });
    return missing;
  }, [items, quantities, selectedSupplierId]);

  const handleCompareSuppliers = async () => {
    if (!hasAnyQuantity) {
      alert("Please set quantities for at least one item.");
      return;
    }
    const allSupplierIds = suppliers.map(s => s._id);
    if (allSupplierIds.length === 0) {
      alert("No suppliers exist in the system to compare.");
      return;
    }
    setCompareLoading(true);
    setCompareResult(null);
    try {
      const data = await compareQuotation(selectedItemsPayload, allSupplierIds);
      const filteredResults = data.results.filter(r => r.total !== null && r.total !== undefined && r.supplier && r.supplier.name);
      if (filteredResults.length === 0) {
        alert("Comparison ran successfully but no selected items have prices set for any supplier.");
        setCompareLoading(false);
        return;
      }
      setCompareResult({ ...data, results: filteredResults });
    } catch (e) {
      console.error('Comparison API Error:', e);
      alert("Comparison failed. The system requires the selected items to have a price set for at least one supplier.");
    } finally {
      setCompareLoading(false);
    }
  };

  const executePdfGeneration = () => {
    const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
    let FONT_ALIAS = 'Helvetica';
    const FONT_TO_USE = 'Arial';

    if (NOTO_SANS_REGULAR_BASE64 && NOTO_SANS_REGULAR_BASE64.startsWith("AAEAA")) {
        try {
            const FONT_FILE_NAME_VFS = 'MyCustomFont.ttf'; const FONT_INTERNAL_ALIAS = 'MyCustomFont';
            doc.addFileToVFS(FONT_FILE_NAME_VFS, NOTO_SANS_REGULAR_BASE64);
            doc.addFont(FONT_FILE_NAME_VFS, FONT_INTERNAL_ALIAS, 'normal');
            doc.setFont(FONT_INTERNAL_ALIAS, 'normal'); FONT_ALIAS = FONT_INTERNAL_ALIAS;
        } catch (e) { console.error("Error embedding font for PDF:", e); doc.setFont(FONT_TO_USE, 'normal'); FONT_ALIAS = FONT_TO_USE; }
    } else {
        try { doc.setFont(FONT_TO_USE, 'normal'); FONT_ALIAS = FONT_TO_USE; }
        catch (e) { console.warn(`Font ${FONT_TO_USE} not available, falling back.`, e); doc.setFont('Helvetica', 'normal'); FONT_ALIAS = 'Helvetica'; }
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const contentWidth = pageWidth - (2 * margin);
    const formatCurrencyForPDF = (val) => (typeof val === 'number' && !isNaN(val) ? val.toFixed(2) : '0.00');

    doc.setFontSize(9);
    const labelIndent = margin;
    const valuePadding = 2;
    const getValueStartX = (labelText) => {
        doc.setFont(FONT_ALIAS, 'bold');
        const labelWidth = doc.getTextWidth(labelText);
        doc.setFont(FONT_ALIAS, 'normal');
        return labelIndent + labelWidth + valuePadding;
    };
    const projectTitleLabel = 'PROJECT TITLE:';
    doc.setFont(FONT_ALIAS, 'bold');
    doc.text(projectTitleLabel, labelIndent, 15);
    doc.setFont(FONT_ALIAS, 'normal');
    const projectTitleValueX = getValueStartX(projectTitleLabel);
    doc.text(currentQuotationProjectDetails.projectTitle, projectTitleValueX, 15, { maxWidth: contentWidth * 0.55 - projectTitleValueX });
    const projectOwnerLabel = 'PROJECT OWNER:';
    doc.setFont(FONT_ALIAS, 'bold');
    doc.text(projectOwnerLabel, labelIndent, 20);
    doc.setFont(FONT_ALIAS, 'normal');
    const projectOwnerValueX = getValueStartX(projectOwnerLabel);
    doc.text(currentQuotationProjectDetails.projectOwner, projectOwnerValueX, 20, { maxWidth: contentWidth * 0.55 - projectOwnerValueX });
    const pdfTotalToUse = computedTotalForUI;
    const totalLabel = 'TOTAL PROJECT COST (PHP):';
    doc.setFont(FONT_ALIAS, 'bold');
    doc.text(totalLabel, labelIndent, 25);
    doc.setFont(FONT_ALIAS, 'normal');
    const totalValueX = getValueStartX(totalLabel);
    doc.text(formatCurrencyForPDF(pdfTotalToUse), totalValueX, 25, { maxWidth: contentWidth * 0.55 - totalValueX });
    const rightColumnLabelStartX = margin + contentWidth * 0.58;
    doc.setFont(FONT_ALIAS, 'normal');
    doc.text(currentQuotationProjectDetails.reportDate, pageWidth - margin, 15, { align: 'right' });
    const locationLabel = "LOCATION:";
    doc.setFont(FONT_ALIAS, 'bold');
    const locationLabelWidth = doc.getTextWidth(locationLabel);
    doc.text(locationLabel, rightColumnLabelStartX, 20);
    doc.setFont(FONT_ALIAS, 'normal');
    doc.text(currentQuotationProjectDetails.location, rightColumnLabelStartX + locationLabelWidth + valuePadding, 20, { maxWidth: pageWidth - (rightColumnLabelStartX + locationLabelWidth + valuePadding) - margin });
    const durationLabel = "PROJECT DURATION:";
    doc.setFont(FONT_ALIAS, 'bold');
    const durationLabelWidth = doc.getTextWidth(durationLabel);
    doc.text(durationLabel, rightColumnLabelStartX, 25);
    doc.setFont(FONT_ALIAS, 'normal');
    doc.text(currentQuotationProjectDetails.projectDuration, rightColumnLabelStartX + durationLabelWidth + valuePadding, 25, { maxWidth: pageWidth - (rightColumnLabelStartX + durationLabelWidth + valuePadding) - margin });

    let startY = 38;
    const tableRows = [];
    let itemCounterForPDF = 1;
    let currentCategoryInPDF = "";

    const itemsToProcessInPDF = Array.isArray(items) ? items : [];
    const sortedItemsForPDF = [...itemsToProcessInPDF]
      .filter(item => item && item._id && (parseInt(quantities[item._id], 10) || 0) > 0)
      .sort((a, b) => {
        const categoryA = a.category || "zzz_No Category";
        const categoryB = b.category || "zzz_No Category";
        const categoryComp = categoryA.localeCompare(categoryB);
        if (categoryComp !== 0) return categoryComp;
        const itemNoA = a.itemNo || String(a.name || '');
        const itemNoB = b.itemNo || String(b.name || '');
        return itemNoA.localeCompare(itemNoB);
      });

    sortedItemsForPDF.forEach(item => {
        const quantity = parseInt(quantities[item._id], 10) || 0;
        const itemCategory = item.category || "NO CATEGORY ASSIGNED";
        if (itemCategory !== currentCategoryInPDF) {
            tableRows.push([{
                content: itemCategory.toUpperCase(), colSpan: 7,
                styles: { font: FONT_ALIAS, fontStyle: 'bold', fillColor: [230, 230, 230], textColor: [0, 0, 0], halign: 'left', cellPadding: 2, fontSize: 8.5 }
            }]);
            currentCategoryInPDF = itemCategory;
        }
        const basePrice = getSupplierPriceForItem(item) ?? 0;
        const percentage = activePercentages[selectedClientLevel] || 0;
        const laborCostPerUnit = basePrice * (percentage / 100);
        const finalUnitPrice = basePrice + laborCostPerUnit;
        const amount = finalUnitPrice * quantity;

        tableRows.push([
            item.itemNo || itemCounterForPDF++,
            item.description || item.name || "N/A",
            quantity,
            item.unit || 'pc',
            formatCurrencyForPDF(basePrice),
            formatCurrencyForPDF(laborCostPerUnit),
            formatCurrencyForPDF(amount),
        ]);
    });

    if (tableRows.length > 0) {
        autoTable(doc, {
            startY: startY,
            head: [['ITEM NO.', 'ITEM DESCRIPTION', 'QTY', 'UNIT', 'UNIT PRICE', 'LABOR COST', 'AMOUNT']],
            body: tableRows, theme: 'grid',
            styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak', font: FONT_ALIAS },
            headStyles: { font: FONT_ALIAS, fontStyle: 'bold', fillColor: [200, 200, 200], textColor: [0, 0, 0], halign: 'center', valign: 'middle' },
            columnStyles: {
                0: { cellWidth: 18, halign: 'center' }, 
                  1: { cellWidth: 100 }, 
                  2: { cellWidth: 15, halign: 'right' },
                3: { cellWidth: 18, halign: 'center' }, 
                  4: { cellWidth: 30, halign: 'right' }, 
                  5: { cellWidth: 30, halign: 'right' },
                  6: { cellWidth: 35, halign: 'right' },
            },
            margin: { top: startY, bottom: 30, left: margin, right: margin }
        });
        startY = doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY + 8 : startY + 10;
    } else {
        doc.setFont(FONT_ALIAS, 'normal'); doc.text('No items selected for this quotation.', margin, startY); startY += 10;
    }

    const summaryBaseTotal = computedTotalForUI;
    if (summaryBaseTotal > 0 && startY < pageHeight - 45) {
        const summaryStartY = startY; const summaryBoxX = pageWidth - margin - 95; const summaryBoxWidth = 90;
        const valueColumnX = summaryBoxX + summaryBoxWidth - 5; const labelColumnX = summaryBoxX + 5;
        let currentSummaryYOffset = 0;
        doc.setLineWidth(0.3); doc.rect(summaryBoxX, summaryStartY + currentSummaryYOffset, summaryBoxWidth, 10); currentSummaryYOffset += 5;
        doc.setFontSize(8);
        doc.setFont(FONT_ALIAS, 'bold');
        doc.text("TOTAL PROJECT COST", labelColumnX, summaryStartY + currentSummaryYOffset);
        doc.text(formatCurrencyForPDF(summaryBaseTotal), valueColumnX, summaryStartY + currentSummaryYOffset, { align: 'right' });
        startY = summaryStartY + currentSummaryYOffset + 8;
    }

    const signatureBlockMinHeight = 30; let signatureY = startY + 5;
    if (signatureY + signatureBlockMinHeight > pageHeight - (margin / 2)) {
        doc.addPage(); signatureY = margin + 15; doc.setFont(FONT_ALIAS, 'normal'); doc.setFontSize(8);
        doc.text(`Continuation - Quotation: ${currentQuotationProjectDetails.projectTitle}`, margin, margin - 2);
    }
    const preparedByX = margin + 20; const conformeByX = pageWidth / 2 + 30;
    doc.setFontSize(9); doc.setFont(FONT_ALIAS, 'normal');
    doc.text("Prepared by:", preparedByX, signatureY); doc.setLineWidth(0.3); doc.line(preparedByX, signatureY + 7, preparedByX + 60, signatureY + 7);
    doc.text("Jomar R. Cuate", preparedByX, signatureY + 12); doc.text("Proprietor", preparedByX, signatureY + 16);
    doc.text("Conforme by:", conformeByX, signatureY); doc.line(conformeByX, signatureY + 7, conformeByX + 60, signatureY + 7);

    const quotationNumber = `QT-${Date.now()}`;
    doc.save(`${quotationNumber}_${currentQuotationProjectDetails.projectTitle.replace(/\s+/g, '_')}_Quotation.pdf`);
  };

  const openConfirm = (actionFn, config) => {
    setPendingAction(() => actionFn);
    setPendingActionConfig(prev => ({ ...prev, ...config }));
    setShowActionConfirmModal(true);
  };

  const handleConfirmProceed = () => {
    setShowActionConfirmModal(false);
    const toRun = pendingAction;
    setPendingAction(null);
    if (typeof toRun === 'function') toRun();
  };

  const handleGeneratePDFClick = () => {
    if (!selectedSupplierId) { alert("Please select a supplier first."); return; }
    if (!hasAnyQuantity) { alert("Please set quantities for at least one item."); return; }
    openConfirm(executePdfGeneration, {
      title: 'Confirm PDF Generation',
      message: 'Generate the PDF with the current supplier prices and selected quantities?',
      confirmText: 'Generate PDF',
      cancelText: 'Cancel',
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Settings */}
        <div className="space-y-8">
          <div className="bg-sky-50/50 p-6 rounded-3xl border border-sky-100 shadow-inner">
            <h3 className="text-xl font-bold text-sky-800 mb-6 tracking-tight">1. Select Supplier</h3>
            <div>
              <label className="block text-xs font-bold text-sky-500 uppercase tracking-wider mb-2 ml-1">Supplier for Pricing</label>
              <select
                className="bg-white border border-sky-200 text-slate-800 font-medium text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-sky-500 outline-none shadow-sm w-full transition-colors"
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                disabled={loadingSuppliers}
              >
                <option value="">-- Choose a supplier --</option>
                {suppliers.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>
            {selectedSupplierId && (
              <div className="mt-4 p-4 bg-white rounded-2xl border border-sky-100 flex justify-between items-center shadow-sm">
                <span className="font-bold text-slate-600">Current Total:</span>
                <span className="text-xl font-black text-sky-600">₱{(computedTotalForUI || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>

          <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 shadow-inner">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
               <h3 className="text-xl font-bold text-emerald-800 tracking-tight">2. Labor Cost Config</h3>
               <div className="flex items-center gap-2">
                   <button 
                       className="px-4 py-2 rounded-xl font-bold tracking-wide text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
                       onClick={handleCancelSettings}
                       disabled={!areSettingsUnsaved}
                   >
                       Cancel
                   </button>
                   <button 
                       className="px-4 py-2 rounded-xl font-bold tracking-wide text-xs bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-sm disabled:opacity-50"
                       onClick={handleSaveSettings}
                       disabled={!areSettingsUnsaved}
                   >
                       Save Settings
                   </button>
               </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2 ml-1">Client Level</label>
                <select
                  className="bg-white border border-emerald-200 text-slate-800 font-medium text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm w-full transition-colors"
                  value={selectedClientLevel}
                  onChange={(e) => setSelectedClientLevel(e.target.value)}
                  disabled={!selectedSupplierId}
                >
                  <option value="1">Level 1 (Standard)</option>
                  <option value="2">Level 2 (Premium)</option>
                  <option value="3">Level 3 (Enterprise)</option>
                </select>
                {!selectedSupplierId && <p className="text-xs font-bold text-rose-500 mt-2 ml-1">Select a supplier above to enable.</p>}
              </div>

              <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm space-y-4">
                {[1, 2, 3].map(level => (
                  <div key={level} className="flex items-center justify-between">
                     <label className="text-sm font-bold text-slate-600">Level {level} Markup:</label>
                     <div className="relative">
                        <input 
                            type="number"
                            min="0"
                            value={editedPercentages[level]}
                            onChange={(e) => handlePercentageChange(level.toString(), e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-800 font-bold text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none w-24 text-right pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Project Details */}
        <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 shadow-inner">
          <h3 className="text-xl font-bold text-indigo-800 mb-6 tracking-tight">3. Project Overview</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="qFormProjectTitle" className="block text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2 ml-1">Project Title</label>
              <input type="text" id="qFormProjectTitle" name="projectTitle"
                value={currentQuotationProjectDetails.projectTitle} onChange={handleProjectDetailsChange} required
                className="bg-white border border-indigo-200 text-slate-800 font-medium text-sm rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm w-full transition-colors"
              />
            </div>
            <div>
              <label htmlFor="qFormProjectOwner" className="block text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2 ml-1">Project Owner</label>
              <input type="text" id="qFormProjectOwner" name="projectOwner"
                value={currentQuotationProjectDetails.projectOwner} onChange={handleProjectDetailsChange} required
                className="bg-white border border-indigo-200 text-slate-800 font-medium text-sm rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm w-full transition-colors"
              />
            </div>
            <div>
              <label htmlFor="qFormLocation" className="block text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2 ml-1">Location</label>
              <input type="text" id="qFormLocation" name="location"
                value={currentQuotationProjectDetails.location} onChange={handleProjectDetailsChange} required
                className="bg-white border border-indigo-200 text-slate-800 font-medium text-sm rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm w-full transition-colors"
              />
            </div>
            <div>
              <label htmlFor="qFormProjectDuration" className="block text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2 ml-1">Project Duration</label>
              <input type="text" id="qFormProjectDuration" name="projectDuration"
                value={currentQuotationProjectDetails.projectDuration} onChange={handleProjectDetailsChange} required
                className="bg-white border border-indigo-200 text-slate-800 font-medium text-sm rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm w-full transition-colors"
                placeholder="e.g., 30-45 Days"
              />
            </div>
          </div>
        </div>
      </div>

      {itemsMissingPrice.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-3xl shadow-sm mt-8">
            <h4 className="font-bold text-rose-800 mb-2">Action Required: Price Missing</h4>
            <p className="text-sm font-medium text-rose-600 mb-4">
                The selected supplier does not have a price for the following items. Please deselect them or choose a different supplier.
            </p>
            <div className="flex flex-wrap gap-2">
                {itemsMissingPrice.map(name => (
                    <span key={name} className="px-3 py-1 bg-white border border-rose-100 text-rose-700 text-xs font-bold rounded-lg shadow-sm">{name}</span>
                ))}
            </div>
        </div>
      )}

      {/* Item Selection Section */}
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm p-6 mt-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-100 pb-6">
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">4. Add Materials to Quote</h3>
          <div className="relative w-full md:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input
              type="text"
              placeholder="Search materials..."
              value={quotationSearchTerm}
              onChange={handleQuotationSearchChange}
              className="bg-slate-50 border border-slate-200 text-slate-800 font-medium text-sm rounded-full py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-sky-500 outline-none shadow-sm w-full transition-colors focus:bg-white"
            />
          </div>
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {(displayableItemsForSelection.length > 0) ? displayableItemsForSelection.map((item) => (
            item && item._id ?
              <div key={item._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between border border-slate-100 p-4 rounded-2xl shadow-sm bg-white hover:border-sky-200 transition-colors group">
                <div className="w-full sm:w-2/3 mb-4 sm:mb-0">
                  <div className="font-bold text-slate-800 text-base">{item.name || "Unnamed Item"}</div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs font-bold uppercase tracking-widest text-slate-400">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500">{item.unit || "N/A"}</span>
                    {selectedSupplierId && (
                      <span className="text-emerald-500">Price: ₱{(getSupplierPriceForItem(item)?.toFixed(2) ?? 'N/A')}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-center bg-slate-50 p-1.5 rounded-xl border border-slate-100 group-hover:bg-sky-50 transition-colors">
                  <button type="button" className="w-8 h-8 flex items-center justify-center bg-white text-rose-500 font-black rounded-lg hover:bg-rose-500 hover:text-white transition-colors shadow-sm disabled:opacity-50 border border-slate-200"
                    onClick={() => handleQuantityChange(item._id, -1)}
                    disabled={(parseInt(quantities[item._id], 10) || 0) === 0}
                  >-</button>
                  <input type="number" min="0" value={quantities[item._id] || ""}
                    onChange={(e) => handleInputChange(item._id, e.target.value)} placeholder="0"
                    className="w-16 text-center font-black text-slate-800 bg-transparent outline-none"
                  />
                  <button type="button" className="w-8 h-8 flex items-center justify-center bg-white text-emerald-500 font-black rounded-lg hover:bg-emerald-500 hover:text-white transition-colors shadow-sm border border-slate-200"
                    onClick={() => handleQuantityChange(item._id, 1)}
                  >+</button>
                </div>
              </div>
              : null
          )) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                 <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
              </div>
              <p className="text-slate-500 font-medium">No materials available to select.</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-4 mt-4">
        <button type="button" onClick={() => openConfirm(() => { setQuantities({}); setQuotationSearchTerm(""); }, {
          title: 'Clear Inputs',
          message: 'Clear all quantities and search term? This cannot be undone.',
          confirmText: 'Clear',
          cancelText: 'Cancel',
        })}
          className="px-6 py-3.5 rounded-xl font-bold tracking-wide text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors w-full sm:w-auto"
        > Clear Quantities </button>
        
        <button type="button" onClick={handleGeneratePDFClick}
          disabled={!selectedSupplierId || !hasAnyQuantity || itemsMissingPrice.length > 0}
          className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-sm tracking-wide disabled:opacity-50 disabled:hover:translate-y-0 w-full sm:w-auto flex items-center justify-center gap-2"
        > 
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
           Generate PDF Quotation 
        </button>
      </div>

      {selectedSupplierId && selectedItemsForEstimate.length > 0 && (
        <div className="mt-8 bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
             <h4 className="font-black text-slate-800">Live Budget Estimate</h4>
             <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{selectedItemsForEstimate.length} items</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-white text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">Item</th>
                  <th className="py-3 px-6 text-right">Qty</th>
                  <th className="py-3 px-6 text-center">Unit</th>
                  <th className="py-3 px-6 text-right">Unit Price</th>
                  <th className="py-3 px-6 text-right">Labor Cost</th>
                  <th className="py-3 px-6 text-right">Amount (₱)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {selectedItemsForEstimate.map(row => (
                  <tr key={`${row.no}-${row.name}`} className="hover:bg-slate-50/50">
                    <td className="py-3 px-6 font-semibold text-slate-800">{row.name}</td>
                    <td className="py-3 px-6 text-right font-medium text-slate-600">{row.qty}</td>
                    <td className="py-3 px-6 text-center text-slate-500 text-xs font-bold uppercase">{row.unit}</td>
                    <td className="py-3 px-6 text-right text-slate-600">{row.basePrice.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="py-3 px-6 text-right text-slate-600">{row.laborCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="py-3 px-6 text-right font-bold text-slate-800">{row.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-100">
                <tr>
                  <td className="py-4 px-6 font-black text-slate-800 text-right" colSpan={5}>TOTAL ESTIMATE:</td>
                  <td className="py-4 px-6 text-right font-black text-indigo-600 text-lg">₱{supplierTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {compareResult && (
        <div className="mt-8 bg-indigo-50/50 border border-indigo-100 rounded-[2rem] p-6 shadow-sm">
          <h4 className="font-black text-indigo-800 mb-4">Supplier Cost Comparison</h4>
          {compareResult.results && compareResult.results.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
               {compareResult.results.map(r => {
                 const isBest = compareResult.best && compareResult.best.supplier._id === r.supplier._id;
                 return (
                   <div key={r.supplier._id} className={`p-4 rounded-2xl border bg-white ${isBest ? 'border-emerald-400 shadow-md relative' : 'border-slate-200'}`}>
                      {isBest && (
                         <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">Best Option</div>
                      )}
                      <h5 className="font-bold text-slate-800 text-center mb-1 mt-2">{r.supplier.name}</h5>
                      <p className={`text-center font-black text-xl ${isBest ? 'text-emerald-600' : 'text-slate-600'}`}>
                         ₱{Number(r.total).toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </p>
                   </div>
                 );
               })}
            </div>
          ) : (
            <p className="text-sm font-medium text-indigo-600">No supplier pricing found for the selected items to run a comparison.</p>
          )}
        </div>
      )}

      <ConfirmationModal
        isOpen={showActionConfirmModal}
        onClose={() => setShowActionConfirmModal(false)}
        onConfirm={handleConfirmProceed}
        title={pendingActionConfig.title}
        message={pendingActionConfig.message}
        confirmText={pendingActionConfig.confirmText}
        cancelText={pendingActionConfig.cancelText}
      />
    </div>
  );
};

export default QuotationForm;
