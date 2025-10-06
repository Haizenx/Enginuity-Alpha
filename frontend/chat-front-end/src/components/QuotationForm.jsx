import React, { useState, useEffect, useMemo } from "react";
import { compareQuotation } from "../services/quotationService";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ConfirmationModal from './ConfirmationModal';
import { fetchSuppliers } from "../services/supplierService";

// --- Font Embedding (Optional) ---
const NOTO_SANS_REGULAR_BASE64 = ""; // Leave empty or remove if not embedding

const QuotationForm = ({ items, projectDetails: initialProjectDetails, onBulkItemsAdded }) => {
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
    <div className="p-6 bg-gray-100 rounded-lg shadow">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6 border-b pb-3">
        Prepare Quotation Details
      </h2>

      <div className="mb-6 p-4 border border-gray-300 rounded-md bg-white">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Supplier</h3>
        <div className="flex gap-2 items-center">
          <select
            className="select select-bordered select-sm w-full md:w-80"
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            disabled={loadingSuppliers}
          >
            <option value="">Select a supplier...</option>
            {suppliers.map(s => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
          {selectedSupplierId && (
            <span className="text-sm text-gray-600">Total: {(computedTotalForUI || 0).toFixed(2)}</span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">Item amounts are based on the selected supplier's prices.</p>
      </div>

      <div className="mb-6 p-4 border border-gray-300 rounded-md bg-white">
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-gray-700">Labor Cost Configuration</h3>
            <div className="flex items-center gap-2">
                <button 
                    className="btn btn-sm btn-outline"
                    onClick={handleCancelSettings}
                    disabled={!areSettingsUnsaved}
                >
                    Cancel
                </button>
                <button 
                    className="btn btn-sm btn-success"
                    onClick={handleSaveSettings}
                    disabled={!areSettingsUnsaved}
                >
                    Save Settings
                </button>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Select Client Level</label>
            <select
              className="select select-bordered select-sm w-full"
              value={selectedClientLevel}
              onChange={(e) => setSelectedClientLevel(e.target.value)}
              disabled={!selectedSupplierId}
            >
              <option value="1">Client Level 1</option>
              <option value="2">Client Level 2</option>
              <option value="3">Client Level 3</option>
            </select>
            {!selectedSupplierId && <p className="text-xs text-red-500 mt-1">Select a supplier to enable.</p>}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
                <label className="text-sm w-32">Level 1 Percentage:</label>
                <input 
                    type="number"
                    min="0"
                    value={editedPercentages[1]}
                    onChange={(e) => handlePercentageChange('1', e.target.value)}
                    className="input input-bordered input-sm w-24 text-right"
                    placeholder="e.g., 5"
                />
                <span>%</span>
            </div>
             <div className="flex items-center gap-2">
                <label className="text-sm w-32">Level 2 Percentage:</label>
                <input 
                    type="number"
                    min="0"
                    value={editedPercentages[2]}
                    onChange={(e) => handlePercentageChange('2', e.target.value)}
                    className="input input-bordered input-sm w-24 text-right"
                    placeholder="e.g., 10"
                />
                <span>%</span>
            </div>
             <div className="flex items-center gap-2">
                <label className="text-sm w-32">Level 3 Percentage:</label>
                <input 
                    type="number"
                    min="0"
                    value={editedPercentages[3]}
                    onChange={(e) => handlePercentageChange('3', e.target.value)}
                    className="input input-bordered input-sm w-24 text-right"
                    placeholder="e.g., 15"
                />
                <span>%</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">The selected level's percentage will be added to each item's supplier price as labor cost. Changes must be saved to take effect.</p>
      </div>

      {itemsMissingPrice.length > 0 && (
        <div className="my-4 p-4 border-l-4 border-red-500 bg-red-50 rounded-md">
            <h4 className="font-bold text-red-800">Action Required: Price Missing</h4>
            <p className="text-sm text-red-700 mt-1">
                The selected supplier does not have a price for the following items. Please deselect them or choose a different supplier to proceed.
            </p>
            <ul className="list-disc list-inside text-sm text-red-700 mt-2">
                {itemsMissingPrice.map(name => <li key={name}>{name}</li>)}
            </ul>
        </div>
      )}

      {selectedSupplierId && selectedItemsForEstimate.length > 0 && (
        <div className="mt-6 p-4 border rounded bg-white">
          <h4 className="font-semibold mb-3">Budget Estimate</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead className="bg-gray-100 text-gray-700 text-sm">
                <tr>
                  <th className="py-2 px-3 text-left border">Item No.</th>
                  <th className="py-2 px-3 text-left border">Item Description</th>
                  <th className="py-2 px-3 text-right border">Quantity</th>
                  <th className="py-2 px-3 text-center border">Unit</th>
                  {/* CHANGE: Updated table header for on-screen view */}
                  <th className="py-2 px-3 text-right border">Unit Price</th>
                  <th className="py-2 px-3 text-right border">Labor Cost</th>
                  <th className="py-2 px-3 text-right border">Amount</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {selectedItemsForEstimate.map(row => (
                  <tr key={`${row.no}-${row.name}`} className="hover:bg-gray-50">
                    <td className="py-2 px-3 border">{row.no}</td>
                    <td className="py-2 px-3 border">{row.name}</td>
                    <td className="py-2 px-3 border text-right">{row.qty}</td>
                    <td className="py-2 px-3 border text-center">{row.unit}</td>
                    {/* CHANGE: Updated table cells for on-screen view */}
                    <td className="py-2 px-3 border text-right">{row.basePrice.toFixed(2)}</td>
                    <td className="py-2 px-3 border text-right">{row.laborCost.toFixed(2)}</td>
                    <td className="py-2 px-3 border text-right">{row.amount.toFixed(2)}</td>
                  </tr>
                ))}
                <tr>
                  {/* CHANGE: Updated colSpan for the new total row */}
                  <td className="py-2 px-3 border font-semibold" colSpan={6}>TOTAL</td>
                  <td className="py-2 px-3 border text-right font-semibold">{supplierTotal.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mb-8 p-4 border border-gray-300 rounded-md bg-white space-y-3">
        <h3 className="text-xl font-semibold text-gray-700 mb-3">Project Overview (Editable for this PDF)</h3>
        <div>
          <label htmlFor="qFormProjectTitle" className="block text-sm font-medium text-gray-700">Project Title</label>
          <input type="text" id="qFormProjectTitle" name="projectTitle"
            value={currentQuotationProjectDetails.projectTitle} onChange={handleProjectDetailsChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="qFormProjectOwner" className="block text-sm font-medium text-gray-700">Project Owner</label>
          <input type="text" id="qFormProjectOwner" name="projectOwner"
            value={currentQuotationProjectDetails.projectOwner} onChange={handleProjectDetailsChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="qFormLocation" className="block text-sm font-medium text-gray-700">Location</label>
          <input type="text" id="qFormLocation" name="location"
            value={currentQuotationProjectDetails.location} onChange={handleProjectDetailsChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="qFormProjectDuration" className="block text-sm font-medium text-gray-700">Project Duration</label>
          <input type="text" id="qFormProjectDuration" name="projectDuration"
            value={currentQuotationProjectDetails.projectDuration} onChange={handleProjectDetailsChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g., 30-45 Days"
          />
        </div>
        <div className="pt-2">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Report Date:</span> {currentQuotationProjectDetails.reportDate}
          </p>
          <p className="text-lg text-gray-700 mt-1">
            <span className="font-semibold">Computed Total Quotation Cost:</span>
            <span className="ml-2 font-bold text-indigo-600">{(computedTotalForUI || 0).toFixed(2)}</span>
          </p>
        </div>
      </div>

      <h3 className="text-xl font-semibold text-gray-700 mb-4">Select Items for Quotation</h3>
      <div className="flex flex-col sm:flex-row gap-4 mb-4 p-4 bg-gray-50 rounded-md border items-center">
        <input
          type="text"
          placeholder="Search items by name..."
          value={quotationSearchTerm}
          onChange={handleQuotationSearchChange}
          className="input input-bordered w-full sm:flex-grow p-2 text-sm h-10"
        />
        <button
          onClick={toggleQuotationSortDirection}
          className="btn btn-outline btn-sm w-full sm:w-auto h-10"
        >
          Sort Name ({quotationSortAscending ? "A-Z" : "Z-A"})
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2 mb-6 custom-scrollbar">
        {(displayableItemsForSelection.length > 0) ? displayableItemsForSelection.map((item) => (
          item && item._id ?
            <div key={item._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between border p-3 rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow">
              <div className="w-full sm:w-3/5 mb-2 sm:mb-0">
                <div className="font-medium text-gray-800">{item.name || "Unnamed Item"}</div>
                <div className="text-xs text-gray-500">
                  Unit: {item.unit || "N/A"}
                  {selectedSupplierId && (
                    <span className="ml-2">Supplier Price: {(getSupplierPriceForItem(item)?.toFixed(2) ?? 'N/A')}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 self-end sm:self-center">
                <button type="button" className="px-2.5 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm disabled:opacity-50"
                  onClick={() => handleQuantityChange(item._id, -1)}
                  disabled={(parseInt(quantities[item._id], 10) || 0) === 0}
                >-</button>
                <input type="number" min="0" value={quantities[item._id] || ""}
                  onChange={(e) => handleInputChange(item._id, e.target.value)} placeholder="0"
                  className="w-16 text-center border border-gray-300 rounded p-1 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button type="button" className="px-2.5 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                  onClick={() => handleQuantityChange(item._id, 1)}
                >+</button>
              </div>
            </div>
            : null
        )) : (
          <p className="text-center text-gray-500 my-4">
            {quotationSearchTerm ? "No items match your search." : (Array.isArray(items) && items.length > 0 ? "All available items currently hidden by search/filter." : "No items available to select.")}
          </p>
        )}
      </div>

      {(!Array.isArray(items) || items.length === 0) && !quotationSearchTerm && (
        <p className="text-center text-gray-500 my-6">No items have been added to the system yet to select for a quotation.</p>
      )}

      <div className="flex flex-col sm:flex-row justify-end items-center pt-6 mt-6 border-t">
        <button type="button" onClick={() => openConfirm(() => { setQuantities({}); setQuotationSearchTerm(""); }, {
          title: 'Clear Inputs',
          message: 'Clear all quantities and search term? This cannot be undone.',
          confirmText: 'Clear',
          cancelText: 'Cancel',
        })}
          className="btn btn-outline btn-sm mb-3 sm:mb-0 sm:mr-3 w-full sm:w-auto"
        > Clear Quantities & Search </button>
        
        <button type="button" onClick={handleGeneratePDFClick}
          disabled={!selectedSupplierId || !hasAnyQuantity || itemsMissingPrice.length > 0}
          className="btn btn-success btn-md w-full sm:w-auto"
        > Generate PDF Quotation </button>
      </div>

      {compareResult && (
        <div className="mt-4 p-4 border rounded bg-white">
          <h4 className="font-semibold mb-2">Supplier Comparison</h4>
          {compareResult.results && compareResult.results.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border">
                <thead className="bg-gray-100 text-gray-700 text-sm">
                  <tr>
                    <th className="py-2 px-3 text-left border">Supplier</th>
                    <th className="py-2 px-3 text-right border">Total</th>
                    <th className="py-2 px-3 text-center border">Best</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {compareResult.results.map(r => (
                    <tr key={r.supplier._id} className="hover:bg-gray-50">
                      <td className="py-2 px-3 border">{r.supplier.name}</td>
                      <td className="py-2 px-3 border text-right">{Number(r.total).toFixed(2)}</td>
                      <td className="py-2 px-3 border text-center">
                        {compareResult.best && compareResult.best.supplier._id === r.supplier._id ? (
                          <span className="text-green-700 font-semibold">Yes</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-600">No supplier pricing found for selected items.</p>
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
