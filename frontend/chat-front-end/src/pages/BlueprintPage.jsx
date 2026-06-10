import React, { useEffect, useMemo, useState } from "react";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { axiosInstance } from "../lib/axios";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { FileText } from "lucide-react";

// --- HELPER COMPONENT FOR TABLE RENDERING ---

const renderFormattedText = (text, isDark = false) => {
  if (!text) return null;
  return text.split("\n").map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // Check if it's a section header line and skip it if the parser missed it
    if (
      trimmed.match(
        /\*\*(DESCRIPTION|ANALYSIS|CONCLUSION|MATERIALS|BUDGET|SUPPLIER).*?\*\*:/i,
      )
    )
      return null;

    // Handle bolding: split by **
    const parts = trimmed.split(/\*\*/);
    const formattedLine = parts.map((part, i) =>
      i % 2 === 1 ? (
        <strong key={i} className="font-bold text-current">
          {part}
        </strong>
      ) : (
        part
      ),
    );

    // Handle bullets
    if (
      trimmed.startsWith("- ") ||
      trimmed.startsWith("* ") ||
      trimmed.startsWith("• ")
    ) {
      return (
        <div key={idx} className="flex items-start space-x-3 mt-3 mb-1">
          <div
            className={`w-1.5 h-1.5 rounded-full ${isDark ? "bg-indigo-400" : "bg-indigo-500"} mt-2 flex-shrink-0`}
          ></div>
          <div
            className={`${isDark ? "text-slate-300" : "text-slate-600"} leading-relaxed flex-grow`}
          >
            {formattedLine.slice(1)}
          </div>
        </div>
      );
    }

    // Handle headers
    if (trimmed.startsWith("###")) {
      return (
        <h5 key={idx} className={`text-base font-bold mt-5 mb-2 ${isDark ? "text-white" : "text-slate-800"}`}>
          {formattedLine.slice(1)}
        </h5>
      );
    }

    return (
      <p key={idx} className={`mt-3 mb-2 leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
        {formattedLine}
      </p>
    );
  });
};

const renderTableSection = (content, header) => {
  if (!content || !content.trim()) return null;

  const lines = content
    .trim()
    .split("\n")
    .filter((line) => line.includes("|") || line.includes("---"));
  if (lines.length < 2) {
    // Fallback: render as a clean two-column table
    return (
      <div className="overflow-x-auto mt-2 rounded-2xl border border-slate-100 bg-white">
        <table className="min-w-full divide-y divide-slate-100">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Item / Recommendation
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Details & Supplier
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {content
              .split("\n")
              .filter((l) => l.trim())
              .map((line, idx) => {
                let title = "";
                let details = line;

                if (line.includes(" - ")) {
                  const parts = line.split(" - ");
                  title = parts[0];
                  details = parts.slice(1).join(" - ");
                } else if (line.includes(":")) {
                  const colonIdx = line.indexOf(":");
                  title = line.substring(0, colonIdx);
                  details = line.substring(colonIdx + 1);
                } else {
                  title = "";
                  details = line;
                }

                title = title
                  .replace(/^[\-\*\d\.]+\s*/, "")
                  .replace(/\*\*/g, "")
                  .trim();
                details = details.replace(/\*\*/g, "").trim();

                if (!title && !details) return null;

                const isParagraph = title.length > 50 || details.length > 200;

                return (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    {isParagraph || !title ? (
                      <td
                        colSpan="2"
                        className="px-4 py-3 text-[13px] font-medium text-slate-600"
                      >
                        {title && (
                          <span className="font-bold text-slate-800 block mb-1">
                            {title}
                          </span>
                        )}
                        {details}
                      </td>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-[13px] font-bold text-slate-800 w-1/3 align-top">
                          {title}
                        </td>
                        <td className="px-4 py-3 text-[13px] font-medium text-slate-600 align-top">
                          {details}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    );
  }

  const headerLineIndex = lines.findIndex(
    (line) => line.includes("|") && !line.includes("---"),
  );
  if (headerLineIndex === -1) return null;

  const rawHeaders = lines[headerLineIndex]
    .split("|")
    .map((h) => h.trim())
    .filter((h) => h);
  const dataRows = lines
    .slice(headerLineIndex + 2)
    .filter((line) => !line.includes("---"));

  return (
    <div className="overflow-x-auto mt-2 rounded-2xl border border-slate-100 bg-white">
      <table className="min-w-full divide-y divide-slate-100">
        <thead>
          <tr className="bg-slate-50/50">
            {rawHeaders.map((h, index) => (
              <th
                key={index}
                className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {dataRows.map((line, rowIndex) => {
            const columns = line
              .split("|")
              .map((c) => c.trim())
              .filter((c) => c);
            if (columns.length !== rawHeaders.length) return null;

            const isTotalRow = columns.some((c) =>
              /TOTAL|SUBTOTAL|GRAND\s*TOTAL|RANGE/i.test(c),
            );

            return (
              <tr
                key={rowIndex}
                className={`hover:bg-slate-50/50 transition-colors ${isTotalRow ? "bg-indigo-50/30" : ""}`}
              >
                {columns.map((col, colIndex) => (
                  <td
                    key={colIndex}
                    className={`px-4 py-3 text-[13px] ${isTotalRow ? "font-bold text-slate-900" : "font-medium text-slate-600"} ${isTotalRow && colIndex === columns.length - 1 ? "text-right text-base text-indigo-600" : "text-left"}`}
                  >
                    {col}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
// ----------------------------------------------------------------------

const BlueprintPage = () => {
  // --- STATE MANAGEMENT ---

  const [image, setImage] = useState(null);

  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState(null);

  const [keywords, setKeywords] = useState([]);
  // PDF State
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfFilename, setPdfFilename] = useState("");

  // History Modal State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [itemToRename, setItemToRename] = useState(null);
  const [newHistoryName, setNewHistoryName] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Collapsible Sections State
  const [collapsedSections, setCollapsedSections] = useState({
    description: false,
    analysis: false,
    materials: false,
    budget: false,
    supplierComparison: false,
    conclusion: false,
  });

  const [relatedQuestions, setRelatedQuestions] = useState([]);

  const [textPrompt, setTextPrompt] = useState("");

  const [previewUrl, setPreviewUrl] = useState(null);

  const [lastAnalysisInputType, setLastAnalysisInputType] = useState(null);

  const [fileType, setFileType] = useState(null);

  const [parsedSections, setParsedSections] = useState(null);
  const [history, setHistory] = useState([]);

  // Load history on mount

  const toggleSection = (sectionKey) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

    // Helper to parse markdown table strings into arrays
  const parseMarkdownTableForPdf = (tableStr) => {
    if (!tableStr) return { head: [], body: [] };
    const lines = tableStr.trim().split("\n").filter(line => line.includes("|"));
    if (lines.length < 2) {
      return { 
        head: [["Item", "Details"]], 
        body: tableStr.trim().split("\n").map(l => {
          let t = l.replace(/^[\-\*\d\.]+\s*/, "").replace(/\*\*/g, "").trim();
          return [t, ""];
        }).filter(r => r[0])
      };
    }
    
    const sepIndex = lines.findIndex(l => l.includes("---"));
    const headerLine = sepIndex > 0 ? lines[sepIndex - 1] : lines[0];
    
    const head = [headerLine.split("|").map(h => sanitizePdfText(h.trim().replace(/\*\*/g, ""))).filter(h => h)];
    
    const bodyLines = sepIndex !== -1 ? lines.slice(sepIndex + 1) : lines.slice(1);
    const body = bodyLines.map(line => {
      return line.split("|").map(c => sanitizePdfText(c.trim().replace(/\*\*/g, ""))).filter(c => c);
    }).filter(row => row.length > 0 && row.some(cell => cell.length > 0));

    return { head, body };
  };


  const sanitizePdfText = (text) => {
    if (!text) return "";
    return text
        .replace(/₱/g, "PHP ")
        .replace(/±/g, "+/- ")
        .replace(/²/g, " sq.")
        .replace(/—/g, "-")
        .replace(/['']/g, "'")
        .replace(/["""]/g, '"')
        .replace(/[^\x20-\x7E]/g, ""); // Strip any remaining non-ASCII Unicode to prevent jsPDF spacing corruption
  };

  const handleDownloadPdf = () => {
    if (!pdfFilename.trim() || !parsedSections) return;
    
    // Create new A4 PDF
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4"
    });
    
    // Colors
    const indigoColor = [79, 70, 229]; // #4f46e5
    const slateDark = [30, 41, 59]; // #1e293b
    const slateLight = [100, 116, 139]; // #64748b
    
    let yPos = 40;
    const margin = 40;
    const pageWidth = doc.internal.pageSize.width;
    const maxLineWidth = pageWidth - margin * 2;
    
    const checkPageBreak = (neededHeight) => {
      if (yPos + neededHeight > doc.internal.pageSize.height - 40) {
        doc.addPage();
        yPos = 40;
      }
    };

    // HEADER
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(...indigoColor);
    doc.text("Enginuity", margin, yPos);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...slateLight);
    doc.text(new Date().toLocaleDateString(), pageWidth - margin - 60, yPos);
    
    yPos += 25;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...slateDark);
    doc.text("AI Blueprint Analysis Report", margin, yPos);
    
    yPos += 15;
    
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 25;

    const printTextBlock = (title, content) => {
      if (!content) return;
      checkPageBreak(60); 
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...slateDark);
      doc.text(title.toUpperCase(), margin, yPos);
      yPos += 15;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...slateDark);
      
      const cleanContent = sanitizePdfText(content.replace(/\*\*/g, ""));
      const textLines = doc.splitTextToSize(cleanContent, maxLineWidth);
      
      textLines.forEach(line => {
        checkPageBreak(15);
        doc.text(line, margin, yPos);
        yPos += 14; // Tight line height for compactness
      });
      
      yPos += 20; 
    };

    printTextBlock("Overview", parsedSections.description);
    printTextBlock("Analysis", parsedSections.analysis);
    
    const printTableSection = (title, mdContent) => {
      if (!mdContent) return;
      const tableData = parseMarkdownTableForPdf(mdContent);
      if (tableData.head.length === 0 || tableData.head[0].length === 0) return;
      
      checkPageBreak(50);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...slateDark);
      doc.text(title.toUpperCase(), margin, yPos);
      yPos += 10;
      
      autoTable(doc, {
        startY: yPos,
        head: tableData.head,
        body: tableData.body,
        theme: 'grid',
        headStyles: { fillColor: indigoColor, textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { textColor: slateDark, fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: margin, right: margin },
        styles: { cellPadding: 4, overflow: 'linebreak' },
        didParseCell: function(data) {
           if (data.row.raw.some(c => typeof c === 'string' && /TOTAL|SUBTOTAL/i.test(c))) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [238, 242, 255]; 
           }
        }
      });
      
      yPos = doc.lastAutoTable.finalY + 25;
    };

    printTableSection("Materials & Recommendations", parsedSections.materials);
    printTableSection("Supplier Comparison", parsedSections.supplierComparison);
    printTableSection("Budget Estimate", parsedSections.budget);

    printTextBlock("Conclusion", parsedSections.conclusion);

    doc.save(`${pdfFilename.trim()}.pdf`);
    
    setIsPdfModalOpen(false);
    setPdfFilename("");
  };

  const openRenameModal = (item, e) => {
    e.stopPropagation();
    setItemToRename(item);
    setNewHistoryName(item.prompt || "Visual Blueprint Analysis");
    setRenameModalOpen(true);
  };

  const confirmRename = () => {
    const updatedHistory = history.map((item) =>
      item.id === itemToRename.id ? { ...item, prompt: newHistoryName } : item,
    );
    setHistory(updatedHistory);
    localStorage.setItem(
      "aiAnalysisHistory",
      JSON.stringify(updatedHistory),
    );
    setRenameModalOpen(false);
    setItemToRename(null);
  };

  const openDeleteModal = (item, e) => {
    e.stopPropagation();
    setItemToDelete(item);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    const updatedHistory = history.filter(
      (item) => item.id !== itemToDelete.id,
    );
    setHistory(updatedHistory);
    localStorage.setItem(
      "aiAnalysisHistory",
      JSON.stringify(updatedHistory),
    );
    setDeleteModalOpen(false);
    setItemToDelete(null);
    // If there is no history left, close modal
    if (updatedHistory.length === 0) {
      setIsHistoryModalOpen(false);
    }
  };

  useEffect(() => {
    const savedHistory = localStorage.getItem("aiAnalysisHistory");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  useEffect(() => {
    const fetchDBHistory = async () => {
      try {
        const { data } = await axiosInstance.get("/gemini/history");
        if (data && data.length > 0) {
          const formatted = data.map(item => ({
            id: item._id,
            date: item.createdAt,
            prompt: item.keywords?.length > 0 ? "Keywords: " + item.keywords.join(", ") : "AI Analysis",
            type: "image",
            previewText: item.analysis.substring(0, 100) + "...",
            fullResponse: item.analysis,
          }));
          setHistory(formatted);
          localStorage.setItem("aiAnalysisHistory", JSON.stringify(formatted));
        }
      } catch (error) {
        console.error("Error fetching analysis history from DB", error);
      }
    };
    
    fetchDBHistory();
  }, []);


    const saveToHistory = async (promptText, results, inputType) => {
    const newItem = {
      id: Date.now(),
      date: new Date().toISOString(),
      prompt: promptText || "Image Analysis",
      type: inputType,
      previewText: results.substring(0, 100) + "...",
      fullResponse: results, 
    };
    
    // Optimistic UI update
    const updatedHistory = [newItem, ...history].slice(0, 50); 
    setHistory(updatedHistory);
    localStorage.setItem("aiAnalysisHistory", JSON.stringify(updatedHistory));

    // Save to Database
    try {
      // For database saving, if it's an image, we need the base64 string
      // But we only want to save if there's an image because the route requires imageBase64 currently.
      // If we don't have the image in base64 readily available here, we might just rely on the API.
      // Wait, let's just make the backend endpoint accept text too.
      await axiosInstance.post("/gemini/history", {
        imageBase64: image ? image.split(',')[1] : null, // Remove data:image/jpeg;base64, prefix if present
        analysis: results,
        promptText: promptText
      });
    } catch (err) {
      console.error("Failed to save history to DB", err);
    }
  };

  const loadHistoryItem = (item) => {
    setIsHistoryModalOpen(false);
    if (!item.fullResponse) {
      if (item.type === "text") {
         setTextPrompt(item.prompt);
         analyzeTextPrompt("", item.prompt);
      } else {
         alert("Cannot re-assess an old image query without the original image file. Please re-upload the blueprint to analyze it again.");
      }
      return;
    }
    setResult(item.fullResponse);
    setTextPrompt(item.prompt);
    setLastAnalysisInputType(item.type);
    
    generateKeywords(item.fullResponse);
    const sections = parseResponseIntoSections(item.fullResponse);
    setParsedSections(sections);
    
    if (item.type === "image") {
        if (item.fullResponse.trim().startsWith("Analysis:")) {
            generateRelatedQuestions(item.fullResponse, "blueprint_analysis");
        } else {
            generateRelatedQuestions(item.fullResponse, "image_description");
        }
    } else {
        generateRelatedQuestions(item.fullResponse, "text_query");
    }

    setIsHistoryModalOpen(false);
  }; // Supplier/Items catalog for AI context

  const [suppliers, setSuppliers] = useState([]);
  const [itemsCatalog, setItemsCatalog] = useState([]);
  const [includeSupplierCatalog, setIncludeSupplierCatalog] = useState(true);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const [supRes, itemRes] = await Promise.all([
          axiosInstance.get("/suppliers"),
          axiosInstance.get("/items"),
        ]);
        setSuppliers(Array.isArray(supRes.data) ? supRes.data : []);
        setItemsCatalog(Array.isArray(itemRes.data) ? itemRes.data : []);
      } catch (e) {
        console.error("Failed to load suppliers/items for AI context", e);
      }
    };
    loadCatalog();
  }, []);

  const supplierCatalogContext = useMemo(() => {
    if (!includeSupplierCatalog) return "";
    if (!Array.isArray(itemsCatalog) || itemsCatalog.length === 0) return ""; // Build supplierId -> name map
    const supplierIdToName = new Map(
      (suppliers || []).map((s) => [String(s._id), s.name]),
    ); // Build compact catalog: for each item, list up to 3 supplier offers (name: price)
    const lines = [];
    let count = 0;
    for (const item of itemsCatalog) {
      const name = item?.name || "";
      const unit = item?.unit || "";
      const offers = Array.isArray(item?.supplierPrices)
        ? item.supplierPrices
        : [];
      if (name && offers.length > 0) {
        const mapped = offers
          .map((o) => ({
            // FIX: Only use the supplier NAME if found, otherwise discard the offer for the context.
            supplier: supplierIdToName.get(String(o.supplier)),
            price: Number(o.price) || 0,
          }))
          .filter((o) => o.supplier) // Only include offers where we found a valid name
          .sort((a, b) => a.price - b.price)
          .slice(0, 3);
        if (mapped.length > 0) {
          const offerStr = mapped
            .map((o) => `${o.supplier}: ${o.price}`)
            .join(", ");
          lines.push(`- ${name} (${unit}) -> ${offerStr}`);
          count += 1;
        }
      }
      if (count >= 30) break; // keep prompt small
    }
    if (lines.length === 0) return "";
    return `\n**Available Supplier Catalog (PH Prices):** Prioritize recommending from these offers ONLY.
${lines.join("\n")}\n`;
  }, [includeSupplierCatalog, itemsCatalog, suppliers]); // --- HELPER FUNCTIONS ---

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const fileToGenerativePart = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        const base64Data = reader.result;

        const base64Content = base64Data.split(",")[1];

        resolve({
          inlineData: { data: base64Content, mimeType: file.type },
        });
      };

      reader.onerror = reject;

      reader.readAsDataURL(file);
    });
  };

  const resetResultsAndQuestions = () => {
    setResult(null);

    setKeywords([]);

    setRelatedQuestions([]);

    setLastAnalysisInputType(null);

    setParsedSections(null);
  };

  const parseResponseIntoSections = (responseText) => {
    const sections = {
      description: "",
      recommendations: "",
      budget: "",
      materials: "",
      analysis: "",
      supplierComparison: "",
      conclusion: "",
    }; // Try to extract sections based on common patterns

    const lines = responseText.split("\n");
    let currentSection = "description";
    let currentContent = [];

    for (let line of lines) {
      const trimmedLine = line.trim(); // Check for section headers (look for **SECTION:** format or similar)
      if (
        trimmedLine.match(/^\*\*DESCRIPTION\*\*:?/i) ||
        trimmedLine.toLowerCase().includes("description:") ||
        trimmedLine.toLowerCase().includes("what it's all about") ||
        trimmedLine.toLowerCase().includes("overview:")
      ) {
        if (currentContent.length > 0) {
          sections[currentSection] = currentContent.join("\n").trim();
        }
      } else if (
        trimmedLine.match(/^\*\*ANALYSIS\*\*:?/i) ||
        trimmedLine.toLowerCase().includes("analysis:") ||
        trimmedLine.toLowerCase().includes("measurement")
      ) {
        if (currentContent.length > 0) {
          sections[currentSection] = currentContent.join("\n").trim();
        }
        currentSection = "analysis";
        currentContent = [];
      } else if (
        trimmedLine.match(/^\*\*MATERIALS?\s*&\s*RECOMMENDATIONS?\*\*:?/i) ||
        trimmedLine.toLowerCase().includes("materials & recommendations:") ||
        trimmedLine.toLowerCase().includes("materials and recommendations:") ||
        trimmedLine.toLowerCase().includes("recommendation:") ||
        trimmedLine.toLowerCase().includes("suggest:")
      ) {
        if (currentContent.length > 0) {
          sections[currentSection] = currentContent.join("\n").trim();
        }
        currentSection = "materials";
        currentContent = [];
      } else if (
        trimmedLine.match(/^\*\*SUPPLIER\s*COMPARISON\*\*:?/i) ||
        trimmedLine.toLowerCase().includes("supplier comparison:") ||
        trimmedLine.toLowerCase().includes("comparison by supplier:")
      ) {
        if (currentContent.length > 0) {
          sections[currentSection] = currentContent.join("\n").trim();
        }
        currentSection = "supplierComparison";
        currentContent = [];
      } else if (
        trimmedLine.match(/^\*\*BUDGET\s*ESTIMATE\*\*:?/i) ||
        trimmedLine.toLowerCase().includes("budget estimate:") ||
        trimmedLine.toLowerCase().includes("budget:") ||
        trimmedLine.toLowerCase().includes("cost:") ||
        trimmedLine.toLowerCase().includes("price:")
      ) {
        if (currentContent.length > 0) {
          sections[currentSection] = currentContent.join("\n").trim();
        }
        currentSection = "budget";
        currentContent = [];
      } else if (
        trimmedLine.match(/^\*\*CONCLUSION\*\*:?/i) ||
        trimmedLine.toLowerCase().includes("conclusion:") ||
        trimmedLine.toLowerCase().includes("final recommendation:")
      ) {
        if (currentContent.length > 0) {
          sections[currentSection] = currentContent.join("\n").trim();
        }
        currentSection = "conclusion";
        currentContent = [];
      } else if (trimmedLine.length > 0) {
        currentContent.push(line);
      }
    } // Add the last section

    if (currentContent.length > 0) {
      sections[currentSection] = currentContent.join("\n").trim();
    } // If no specific sections found, put everything in description

    if (
      !sections.description &&
      !sections.recommendations &&
      !sections.budget &&
      !sections.analysis &&
      !sections.materials &&
      !sections.supplierComparison &&
      !sections.conclusion
    ) {
      sections.description = responseText;
    }

    return sections;
  }; // --- EVENT HANDLERS ---

  const handleImageUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const uploadedFile = e.target.files[0]; // CHANGED: We now check the file type here.
      if (uploadedFile.type === "application/pdf") {
        setFileType("pdf");
      } else {
        setFileType("image");
      }

      setImage(uploadedFile);
      setPreviewUrl(URL.createObjectURL(uploadedFile));
      resetResultsAndQuestions();
    }
  };

  const handleClearImage = () => {
    setImage(null);

    setPreviewUrl(null);

    resetResultsAndQuestions();

    const fileInput = document.getElementById("image-upload");

    if (fileInput) fileInput.value = "";
  };

  const handleTextPromptChange = (e) => {
    setTextPrompt(e.target.value);
  }; // --- CORE AI FUNCTIONS ---

  const analyzeImage = async (additionalContextForAI = "") => {
    if (!image) return;

    setLoading(true);

    resetResultsAndQuestions();

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    // Heuristic check for relevance to construction cost/materials (to enable tables)
    const isCostRelevant =
      textPrompt.toLowerCase().includes("cost") ||
      textPrompt.toLowerCase().includes("price") ||
      textPrompt.toLowerCase().includes("budget") ||
      textPrompt.toLowerCase().includes("supplier") ||
      textPrompt.toLowerCase().includes("material") ||
      textPrompt.toLowerCase().includes("php") ||
      textPrompt.toLowerCase().includes("estimate");

    const costConstraint = isCostRelevant
      ? ""
      : "If the query/image analysis is NOT relevant to material choice, cost, or suppliers, leave the MATERIALS, COMPARISON, BUDGET, and CONCLUSION sections BLANK.";

    try {
      const imagePart = await fileToGenerativePart(image);

      const fullPrompt = `You are an elite, highly experienced structural engineer, chief architect, and master estimator. Your task is to perform a comprehensive, professional-grade analysis of the provided image, focusing strictly on the **Philippine construction and engineering context** (using PHP, local costs, and structural practices like tropical design, hollow blocks, typhoon, and earthquake resilience). 

First, explicitly confirm if the image is a construction blueprint, architectural drawing, or floor plan. If it is NOT a valid architectural or construction document, state this clearly and do not generate the subsequent estimation sections.

Please structure your response with the following precise engineering section headers:

**DESCRIPTION:**
Provide a professional, highly descriptive executive summary (maximum 3 sentences) of the document. Identify the drawing type, scope, and primary architectural intent. Tailor the terminology to Philippine engineering standards.

**ANALYSIS:**
Perform a structured, highly concise architectural and structural analysis using a bulleted list. Detail the spatial breakdown, load-bearing indicators, room layouts, and key structural elements. Focus on Philippine standards (e.g., ventilation, structural integrity against natural disasters). Note any critical observations or clash detection zones.

${costConstraint}

**MATERIALS & RECOMMENDATIONS:**
IMPORTANT: Output this section as a **Markdown Table** (using pipe '|' delimiters). Recommend high-quality, sustainable materials and construction methodologies suitable for the Philippine climate. 
The table columns MUST be: **| Material Name | Chosen Supplier | Reason/Justification |**
You may suggest industry-standard alternatives if specific materials are not in the provided database.

**SUPPLIER COMPARISON:**
IMPORTANT: Output this section as a **Markdown Table** (using pipe '|' delimiters). Conduct a competitive analysis comparing available suppliers from the Supplier Catalog.
The table columns MUST be: **| Material | Supplier | Unit Price (PHP) | Pros/Cons (e.g., logistics, quality) |**
End the table with a row showing the **OVERALL ESTIMATED SUBTOTAL** for each supplier (e.g., | OVERALL SUBTOTAL | Supplier A Total | Supplier B Total | BEST OPTION |). Do NOT mix suppliers in the final recommendation; this section is strictly for comparative analysis.

**BUDGET ESTIMATE:**
IMPORTANT: Output this section as a **Markdown Table** (using pipe '|' delimiters). Provide a rigorous, realistic cost estimate based on current Philippine construction benchmarks (e.g., ₱20,000 to ₱35,000 per sq.m. for standard build).
**CRITICAL CONSTRAINT:** If the total area/scope is unspecified, explicitly declare an assumed baseline scope (e.g., a 50 SQ.M. standard floor area) and calculate quantities accurately based on that baseline.
The table columns MUST be: **| Item | Quantity (e.g., 12.00 pcs) | Unit | Unit Price (PHP) | Subtotal (PHP) |**
Include a FINAL ROW for the **Grand Total Estimated Cost**.

${textPrompt.trim() ? `Also consider this specific client request: "${textPrompt.trim()}".` : ""} ${additionalContextForAI} ${supplierCatalogContext}

**CONCLUSION:**
Deliver your final expert recommendation. Choose EXACTLY ONE supplier as the final recommendation for the entire project phase and justify your choice based on total cost, sustainability, and logistics. Do NOT recommend mixing suppliers. If the client asked a specific question, address it directly at the beginning of the conclusion. Limit to 5 sentences.`;

      const geminiResult = await model.generateContent([fullPrompt, imagePart]);

      const responseText = geminiResult.response
        .text()
        .trim()
        .replace(/```(markdown|html)?/gi, "")
        .replace(/\n\s*\n/g, "\n");

      setResult(responseText);

      setLastAnalysisInputType("image");
      generateKeywords(responseText); // Parse response into sections

      const sections = parseResponseIntoSections(responseText);
      setParsedSections(sections);
      saveToHistory(textPrompt, responseText, "image"); // This logic is now smarter

      if (responseText.trim().startsWith("Analysis:")) {
        await generateRelatedQuestions(responseText, "blueprint_analysis");
      } else {
        await generateRelatedQuestions(responseText, "image_description");
      }
    } catch (error) {
      console.error("Error during blueprint analysis:", error);

      setResult(`Error during blueprint analysis: ${error?.message}`);
    } finally {
      setLoading(false);
    }
  };

  const analyzeTextPrompt = async (additionalContextForAI = "", overridePrompt = null) => {
    const promptToUse = overridePrompt || textPrompt;
    if (!promptToUse.trim()) return;

    setLoading(true);

    resetResultsAndQuestions();

    handleClearImage();

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    // Heuristic check for relevance to construction cost/materials (to enable tables)
    const isCostRelevant =
      textPrompt.toLowerCase().includes("cost") ||
      textPrompt.toLowerCase().includes("price") ||
      textPrompt.toLowerCase().includes("budget") ||
      textPrompt.toLowerCase().includes("supplier") ||
      textPrompt.toLowerCase().includes("material") ||
      textPrompt.toLowerCase().includes("php") ||
      textPrompt.toLowerCase().includes("estimate");

    const costConstraint = isCostRelevant
      ? ""
      : "If the query is NOT relevant to material choice, cost, or suppliers, leave the MATERIALS, COMPARISON, BUDGET, and CONCLUSION sections BLANK.";

    try {
      const prompt = `As a construction and architectural expert, provide a concise recommendation or answer based on the following user query about construction. Focus on practical advice, sustainable practices, or cost-effectiveness within the **Philippine context**.
            ${costConstraint}

            **MATERIALS & RECOMMENDATIONS:**
            IMPORTANT: Output this section as a **Markdown Table** (using pipe '|' delimiters).
            The table columns MUST be: **| Material Name | Chosen Supplier | Reason/Justification |**
            - You MAY suggest materials beyond the supplier catalog.

            **SUPPLIER COMPARISON:**
            IMPORTANT: Output this section as a **Markdown Table** (using pipe '|' delimiters). Compare available suppliers from the Supplier Catalog for 3-5 key recommended materials. Include an overall total row.
            The table columns MUST be: **| Material | Supplier | Unit Price (PHP) | Pros/Cons (e.g., local, cheaper) |**
            End the table with a row showing the **OVERALL ESTIMATED SUBTOTAL** for each supplier (e.g., | OVERALL SUBTOTAL | Supplier A PHP Value | Supplier B PHP Value | BEST OPTION |). Do NOT mix suppliers in the final recommendation; this section is only for comparison.

            **BUDGET ESTIMATE:**
            IMPORTANT: Output this section as a **Markdown Table** (using pipe '|' delimiters). Provide a **realistic cost estimate**.
            **CRITICAL CONSTRAINT:** If the total area/scope is unknown, **assume a common scope, such as a 10 SQ.M. standard ceiling (3m x 3.33m) or a 50 SQ.M. floor area, and calculate quantities accurately for that assumed scope.** Use Philippines construction benchmarks (e.g., ₱20,000 to ₱30,000 per sq.m. for standard build) to guide overall pricing and ensure Unit Prices are realistic.
            The table columns MUST be: **| Item | Quantity (e.g., 12.00 pcs) | Unit | Unit Price (PHP) | Subtotal (PHP) |**
            Include a FINAL ROW for the Grand Total Cost.

            **CONCLUSION:**
            Choose EXACTLY ONE supplier as the final recommendation for this project and state WHY (e.g., best total cost, sustainability, logistics). Do NOT recommend mixing suppliers. Keep it to 2-4 sentences. 

            User Query: "${promptToUse.trim()}" ${additionalContextForAI} ${supplierCatalogContext}`;

      const geminiResult = await model.generateContent([prompt]);

      const responseText = geminiResult.response
        .text()
        .trim()
        .replace(/```(markdown|html)?/gi, "")
        .replace(/\n\s*\n/g, "\n");

      setResult(responseText);

      setLastAnalysisInputType("text");

      generateKeywords(responseText);

      const sections = parseResponseIntoSections(responseText);
      setParsedSections(sections);
      saveToHistory(promptToUse, responseText, "text");

      await generateRelatedQuestions(responseText, "text_query");
    } catch (error) {
      console.error("Error during text analysis:", error);

      setResult(`Error during text analysis: ${error?.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateKeywords = (text) => {
    const words = text.split(/\s+/);

    const keywordsSet = new Set();

    words.forEach((word) => {
      if (
        word.length > 4 &&
        !["this", "that", "which", "from", "have"].includes(word.toLowerCase())
      ) {
        keywordsSet.add(word.replace(/[.,:;]/g, ""));
      }
    });

    setKeywords(Array.from(keywordsSet).slice(0, 5));
  };

  const generateRelatedQuestions = async (responseText, type) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    let questionPrompt = ""; // --- UPDATED: Simplified Related Questions Prompt ---

    if (type === "blueprint_analysis") {
      questionPrompt = `Based on the analysis, generate 3 simple follow-up questions focused on cost, alternatives, or immediate next steps.`;
    } else if (type === "image_description") {
      questionPrompt = `Based on the image description, generate 3 high-level questions about the project's feasibility or key features.`;
    } else {
      // type === 'text_query'
      questionPrompt = `Based on this construction advice, generate 3 practical, follow-up questions for more detail on implementation or budget impact.`;
    }

    try {
      const geminiResult = await model.generateContent([
        `${questionPrompt}\n\nOriginal Context: "${responseText}"\n\nGenerate the questions as a simple list, one per line.`,
      ]);

      const questions = geminiResult.response
        .text()
        .trim()
        .split("\n")
        .filter((q) => q.trim() !== "" && q.length > 5);

      setRelatedQuestions(questions);
    } catch (error) {
      console.error("Error generating related questions:", error);

      setRelatedQuestions([]);
    }
  };

  const askRelatedQuestion = (question) => {
    const fullQuestionPrompt = `Regarding the previous topic, please answer this specific question: "${question}".`;

    if (lastAnalysisInputType === "text") {
      setTextPrompt(question);

      analyzeTextPrompt(fullQuestionPrompt);
    } else if (lastAnalysisInputType === "image") {
      setTextPrompt(question);

      analyzeImage(fullQuestionPrompt);
    }
  };

  const regenerateContent = (keyword) => {
    if (!image) return;

    setTextPrompt(
      `Tell me more about '${keyword}' in relation to this blueprint.`,
    );

    analyzeImage(`Focus the analysis specifically on '${keyword}'.`);
  };

  const handleMainAnalyzeButtonClick = () => {
    if (image) {
      analyzeImage();
    } else if (textPrompt.trim()) {
      analyzeTextPrompt();
    }
  };

  const getButtonText = () => {
    if (loading) return "Analyzing...";

    if (image && textPrompt.trim()) return "Analyze Blueprint & Question";

    if (image) return "Analyze Blueprint";

    if (textPrompt.trim()) return "Get Construction Advice";

    return "Start Analysis";
  };

  const isButtonDisabled = (!image && !textPrompt.trim()) || loading;

  return (
    <main className="min-h-[calc(100vh-80px)] w-full bg-slate-50/50 relative py-12">
      {/* Ambient Background Blobs */}

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar: Controls & History */}
          <div className="w-full lg:w-[400px] flex-shrink-0 space-y-6 print:hidden">
            {/* Control Panel */}
            <div className="bg-white/70 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white p-8 transition-all hover:shadow-[0_8px_40px_rgb(0,0,0,0.06)]">
              <div className="flex items-center space-x-3 mb-8">
                <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center shadow-sm">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                    />
                  </svg>
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  Enginuity AI
                </h2>
              </div>

              <div className="mb-8">
                <label
                  htmlFor="image-upload"
                  className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider"
                >
                  1. Upload Blueprint / Floor Plan
                </label>
                <div className="relative group">
                  <input
                    type="file"
                    id="image-upload"
                    accept=".png,.jpeg,.jpg,.pdf"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={loading}
                  />
                  <div className="w-full p-4 border-2 border-dashed border-indigo-200/80 rounded-2xl bg-indigo-50/30 group-hover:bg-indigo-50/80 group-hover:border-indigo-300 transition-all duration-300 flex items-center justify-center">
                    <div className="flex items-center space-x-2 text-indigo-600 font-semibold text-sm">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span>Choose file or drop it here</span>
                    </div>
                  </div>
                </div>
              </div>

              {previewUrl && (
                <div className="mb-8 relative group">
                  <button
                    type="button"
                    onClick={handleClearImage}
                    className="absolute -top-3 -right-3 z-20 bg-red-500 text-white rounded-full p-1.5 shadow-lg shadow-red-500/30 hover:bg-red-600 hover:scale-110 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  {fileType === "pdf" ? (
                    <div className="w-full p-4 border border-indigo-100 rounded-2xl flex items-center space-x-4 bg-white shadow-sm relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                      <FileText className="h-8 w-8 text-indigo-500 flex-shrink-0" />
                      <div className="overflow-hidden">
                        <p
                          className="text-sm font-bold text-slate-800 truncate"
                          title={image.name}
                        >
                          {image.name}
                        </p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          PDF Document
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200/60 shadow-sm">
                      <img
                        src={previewUrl}
                        alt="Uploaded Blueprint"
                        className="w-full h-40 object-cover hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center my-8">
                <div className="flex-grow h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
                <span className="flex-shrink-0 mx-4 text-slate-400 text-[10px] font-extrabold uppercase tracking-widest">
                  Optional Add-on
                </span>
                <div className="flex-grow h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
              </div>

              <div className="mb-8">
                <label
                  htmlFor="text-input"
                  className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider"
                >
                  2. Specific Instructions
                </label>
                <textarea
                  id="text-input"
                  rows={4}
                  className="block w-full px-4 py-3 text-sm border border-slate-200/80 rounded-2xl bg-white/50 focus:bg-white shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none placeholder:text-slate-400 font-medium"
                  placeholder="e.g., 'Focus on eco-friendly materials' or 'Give me a tight budget estimate'"
                  value={textPrompt}
                  onChange={handleTextPromptChange}
                  disabled={loading}
                ></textarea>
              </div>

              <button
                type="button"
                onClick={handleMainAnalyzeButtonClick}
                disabled={isButtonDisabled}
                className="group relative w-full overflow-hidden rounded-2xl shadow-sm border border-slate-800 disabled:opacity-60 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="absolute inset-0 bg-slate-900 group-hover:bg-slate-800 transition-colors duration-300"></div>

                <div className="relative flex items-center justify-center py-4 px-6 space-x-3">
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-white"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  <span className="text-white font-extrabold tracking-wide">
                    {getButtonText()}
                  </span>
                </div>
              </button>

              <div className="text-center text-slate-400 text-xs mt-6 font-medium flex items-center justify-center space-x-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>AI can make mistakes. Verify important info.</span>
              </div>
            </div>

            {/* History Section */}
            {history.length > 0 && (
              <div className="mt-8">
                <button
                  onClick={() => setIsHistoryModalOpen(true)}
                  className="w-full flex items-center justify-between px-6 py-4 bg-white/60 hover:bg-indigo-600 hover:text-white text-slate-700 font-bold rounded-2xl shadow-sm hover:shadow-lg transition-all group border border-white/80"
                >
                  <div className="flex items-center space-x-3">
                    <svg
                      className="w-5 h-5 text-indigo-500 group-hover:text-white transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>View Recent Analysis</span>
                  </div>
                  <div className="bg-indigo-100 text-indigo-600 group-hover:bg-white/20 group-hover:text-white px-2.5 py-1 rounded-full text-xs font-black">
                    {history.length}
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Right Content: Analysis Results Dashboard */}
          <div className="flex-grow min-w-0">
            {loading || result ? (
              <div className="h-full">
                {loading && (
                  <div className="bg-white/40 backdrop-blur-2xl rounded-[2.5rem] border border-white shadow-2xl shadow-indigo-100/50 p-8 h-full min-h-[70vh] flex flex-col items-center justify-center space-y-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/30 to-transparent"></div>
                    <div className="relative z-10 flex flex-col items-center justify-center">
                      <div className="relative mb-8">
                        <div className="w-24 h-24 border-4 border-indigo-100 rounded-full"></div>
                        <div className="w-24 h-24 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-2xl animate-pulse"></div>
                      </div>
                      <div className="space-y-3 text-center">
                        <h3 className="text-3xl text-slate-800 font-extrabold tracking-tight">
                          Processing Blueprint / Floor Plan
                        </h3>
                        <p className="text-sm text-indigo-600 font-bold uppercase tracking-widest animate-pulse">
                          Running architectural analysis...
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!loading && result && (
                  <div
                    id="analysis-report-content"
                    className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20 bg-slate-50/50 p-6 rounded-3xl"
                  >
                    <div className="flex items-end justify-between pb-6 border-b-2 border-slate-200/50">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
                            Complete
                          </span>
                        </div>
                        <h3 className="text-4xl font-black text-slate-900 tracking-tighter">
                          Analysis Report
                        </h3>
                      </div>
                      <button
                        onClick={() => setIsPdfModalOpen(true)}
                        className="print:hidden flex items-center space-x-2 bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors shadow-sm font-bold text-sm"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        <span>Export PDF</span>
                      </button>
                    </div>{" "}
                    {parsedSections ? (
                      /* BENTO GRID */
                      <div className="grid grid-cols-1 md:grid-cols-6 xl:grid-cols-12 gap-5 auto-rows-[minmax(120px,auto)]">
                        {/* Description Bento (5 columns) */}
                        {parsedSections.description && (
                          <div className="bg-white rounded-3xl p-6 shadow-[0_2px_20px_rgb(0,0,0,0.03)] border border-slate-100 col-span-1 md:col-span-6 xl:col-span-5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all flex flex-col">
                            <div
                              onClick={() => toggleSection("description")}
                              className="flex items-center justify-between cursor-pointer mb-4 group"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
                                  📋
                                </div>
                                <h4 className="text-base font-bold text-slate-800 tracking-tight">
                                  Overview
                                </h4>
                              </div>
                              <svg
                                className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${collapsedSections.description ? "rotate-180" : ""}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </div>
                            <div
                              className={`transition-all duration-300 ease-in-out overflow-hidden flex-grow ${collapsedSections.description ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100"}`}
                            >
                              {renderFormattedText(parsedSections.description)}
                            </div>
                          </div>
                        )}
                        {/* Analysis Bento (7 columns) */}
                        {parsedSections.analysis && (
                          <div className="bg-white rounded-3xl p-6 shadow-[0_2px_20px_rgb(0,0,0,0.03)] border border-slate-100 col-span-1 md:col-span-6 xl:col-span-7 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all flex flex-col">
                            <div
                              onClick={() => toggleSection("analysis")}
                              className="flex items-center justify-between cursor-pointer mb-4 group"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold">
                                  🔍
                                </div>
                                <h4 className="text-base font-bold text-slate-800 tracking-tight">
                                  Architectural Analysis
                                </h4>
                              </div>
                              <svg
                                className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${collapsedSections.analysis ? "rotate-180" : ""}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </div>
                            <div
                              className={`transition-all duration-300 ease-in-out overflow-hidden flex-grow ${collapsedSections.analysis ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100"}`}
                            >
                              {renderFormattedText(parsedSections.analysis)}
                            </div>
                          </div>
                        )}
                        {/* Materials Bento (8 columns) */}
                        {parsedSections.materials && (
                          <div className="bg-white rounded-3xl p-6 shadow-[0_2px_20px_rgb(0,0,0,0.03)] border border-slate-100 col-span-1 md:col-span-6 xl:col-span-12 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all flex flex-col">
                            <div
                              onClick={() => toggleSection("materials")}
                              className="flex items-center justify-between cursor-pointer mb-4 group"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-sm font-bold">
                                  🔨
                                </div>
                                <h4 className="text-base font-bold text-slate-800 tracking-tight">
                                  Materials & Recommendations
                                </h4>
                              </div>
                              <svg
                                className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${collapsedSections.materials ? "rotate-180" : ""}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </div>
                            <div
                              className={`transition-all duration-300 ease-in-out overflow-hidden flex-grow ${collapsedSections.materials ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100"}`}
                            >
                              {renderTableSection(
                                parsedSections.materials,
                                "Materials & Recommendations",
                              )}
                            </div>
                          </div>
                        )}
                        {/* Budget Bento (4 columns, spans 2 rows) */}
                        {parsedSections.budget && (
                          <div className="bg-white rounded-2xl p-7 shadow-sm border border-slate-200 col-span-1 md:col-span-6 xl:col-span-12 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all flex flex-col">
                            <div
                              onClick={() => toggleSection("budget")}
                              className="flex items-center justify-between cursor-pointer mb-4 group"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold">
                                  💰
                                </div>
                                <h4 className="text-base font-bold text-slate-800 tracking-tight">
                                  Estimated Budget
                                </h4>
                              </div>
                              <svg
                                className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${collapsedSections.budget ? "rotate-180" : ""}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </div>
                            <div
                              className={`transition-all duration-300 ease-in-out overflow-hidden flex-grow ${collapsedSections.budget ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100"}`}
                            >
                              {renderTableSection(
                                parsedSections.budget,
                                "Budget Estimate",
                              )}
                            </div>
                          </div>
                        )}
                        {/* Supplier Comparison Bento */}
                        {parsedSections.supplierComparison && (
                          <div className="bg-white rounded-3xl p-6 shadow-[0_2px_20px_rgb(0,0,0,0.03)] border border-slate-100 col-span-1 md:col-span-6 xl:col-span-12 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all flex flex-col">
                            <div
                              onClick={() =>
                                toggleSection("supplierComparison")
                              }
                              className="flex items-center justify-between cursor-pointer mb-4 group"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-sm font-bold">
                                  ⚖️
                                </div>
                                <h4 className="text-base font-bold text-slate-800 tracking-tight">
                                  Supplier Comparison
                                </h4>
                              </div>
                              <svg
                                className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${collapsedSections.supplierComparison ? "rotate-180" : ""}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </div>
                            <div
                              className={`transition-all duration-300 ease-in-out overflow-hidden flex-grow ${collapsedSections.supplierComparison ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100"}`}
                            >
                              {renderTableSection(
                                parsedSections.supplierComparison,
                                "Supplier Comparison",
                              )}
                            </div>
                          </div>
                        )}
                        {/* Conclusion Bento (12 columns) */}
                        {parsedSections.conclusion && (
                          <div className="bg-slate-900 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-800 col-span-1 md:col-span-6 xl:col-span-12 transition-all flex flex-col">
                            <div
                              onClick={() => toggleSection("conclusion")}
                              className="flex items-center justify-between cursor-pointer mb-4 group"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center text-sm font-bold">
                                  🏁
                                </div>
                                <h4 className="text-lg font-bold text-white tracking-tight group-hover:text-indigo-400 transition-colors">
                                  Conclusion
                                </h4>
                              </div>
                              <svg
                                className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${collapsedSections.conclusion ? "rotate-180" : ""}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </div>
                            <div
                              className={`transition-all duration-300 ease-in-out overflow-hidden flex-grow ${collapsedSections.conclusion ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100"}`}
                            >
                              {renderFormattedText(
                                parsedSections.conclusion,
                                true,
                              )}
                            </div>
                          </div>
                        )}{" "}
                      </div>
                    ) : (
                      <div className="bg-white/70 backdrop-blur-xl rounded-[2rem] shadow-xl border border-white p-10">
                        <div className="space-y-5 text-slate-700 leading-loose font-medium text-[15px]">
                          {result.split("\n").map(
                            (line, idx) =>
                              line.trim() &&
                              (line.match(/^\d+\./) || line.startsWith("-") ? (
                                <li
                                  key={idx}
                                  className="ml-6 marker:text-indigo-500 pl-2"
                                >
                                  {line}
                                </li>
                              ) : (
                                <p key={idx}>{line}</p>
                              )),
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            ) : (
              <div 
                onClick={() => document.getElementById('image-upload')?.click()}
                className="cursor-pointer hover:bg-white/60 transition-colors bg-white/40 backdrop-blur-2xl border-2 border-dashed border-indigo-200/50 hover:border-indigo-400 rounded-[3rem] shadow-2xl shadow-slate-200/20 p-12 h-full flex flex-col items-center justify-center text-slate-400 min-h-[70vh] relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/10 to-transparent group-hover:from-indigo-100/20 transition-all"></div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-20 h-20 bg-white shadow-sm rounded-2xl flex items-center justify-center mb-8 border border-indigo-100 group-hover:scale-110 transition-transform duration-300">
                    <span className="text-6xl">
                      <svg
                        className="w-10 h-10 text-indigo-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        />
                      </svg>
                    </span>
                  </div>
                  <h3 className="text-4xl font-black text-slate-800 mb-4 tracking-tight group-hover:text-indigo-900 transition-colors">
                    Upload Blueprint / Floor Plan
                  </h3>
                  <p className="text-slate-500 mt-2">
                    Click anywhere here to upload a construction blueprint, floor plan, or drawing, or type a query on the left
                    to generate an AI-powered report, cost estimate, and
                    material recommendations.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <section className="mt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 relative z-10 border-t border-slate-200 pt-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-3">
            How It Works
          </h2>
          <p className="text-slate-500 text-sm">
            Get accurate blueprint and floor plan analysis and budget estimates in three simple
            steps. Just upload your image, review the initial breakdown, and
            chat for deeper insights or adjustments.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Upload Blueprint",
              desc: "Upload your architectural plans, floor plans, or type your specific construction queries.",
              icon: (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
              ),
            },
            {
              title: "AI Analysis",
              desc: "Our engine scans your plans for structural insights, materials, and potential issues.",
              icon: (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                  />
                </svg>
              ),
            },
            {
              title: "Get Results",
              desc: "Receive a comprehensive report with actionable recommendations and localized budget estimates.",
              icon: (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ),
            },
          ].map((step, idx) => (
            <div
              key={idx}
              className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center hover:border-indigo-200 transition-colors"
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 mb-5">
                {step.icon}
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-2">
                {idx + 1}. {step.title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* --- MODALS --- */}

      {/* PDF Naming Modal */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              Download Report
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Enter a name for your PDF analysis report.
            </p>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-xl px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-700 font-medium"
              placeholder="e.g., Taguig Project Phase 1"
              value={pdfFilename}
              onChange={(e) => setPdfFilename(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsPdfModalOpen(false)}
                className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={!pdfFilename.trim()}
                className="px-5 py-2.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                Confirm Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-3xl w-full max-h-[85vh] shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
                Recent Analysis History
              </h3>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-grow overflow-y-auto space-y-4 pr-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-5 border border-slate-200 rounded-2xl hover:border-indigo-300 transition-all group flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
                >
                  <div
                    className="flex-grow cursor-pointer"
                    onClick={() => loadHistoryItem(item)}
                  >
                    <div className="font-bold text-slate-800 mb-1">
                      {item.prompt || "Visual Blueprint Analysis"}
                    </div>
                    <div className="text-indigo-600 text-xs font-semibold mb-2">
                      {new Date(item.date).toLocaleDateString()} •{" "}
                      {new Date(item.date).toLocaleTimeString()}
                    </div>
                    <div className="text-slate-500 text-sm line-clamp-1">
                      {item.previewText}
                    </div>
                  </div>
                  <div className="flex space-x-2 flex-shrink-0">
                    <button
                      onClick={(e) => openRenameModal(item, e)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Rename"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => openDeleteModal(item, e)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              Rename Analysis
            </h3>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-xl px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
              value={newHistoryName}
              onChange={(e) => setNewHistoryName(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setRenameModalOpen(false)}
                className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRename}
                disabled={!newHistoryName.trim()}
                className="px-5 py-2.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              Delete Analysis?
            </h3>
            <p className="text-slate-500 mb-8">
              Are you sure you want to delete this analysis from your history?
              This action cannot be undone.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-6 py-2.5 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default BlueprintPage;
