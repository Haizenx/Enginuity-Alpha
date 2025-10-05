import React, { useEffect, useMemo, useState } from "react"; 

import { GoogleGenerativeAI } from "@google/generative-ai"; 
import { axiosInstance } from "../lib/axios";

import { FileText } from 'lucide-react';

// --- HELPER COMPONENT FOR TABLE RENDERING ---
const renderTableSection = (content, header) => {
    if (!content || !content.trim()) return null;

    // 1. Split by line and filter out non-table content (non-pipe lines)
    // The separator line (---) must be present for a valid table
    const lines = content.trim().split('\n').filter(line => line.includes('|') || line.includes('---'));
    if (lines.length < 2) {
        // Fallback if AI didn't use a table, just return original content
        return (
            <div className='text-gray-700 leading-relaxed'>
                {content.split('\n').map((line, idx) => line.trim() && (
                    <p key={idx} className='mb-2'>{line}</p>
                ))}
            </div>
        );
    }
    
    // 2. Extract Headers (Find the first line containing '|')
    const headerLineIndex = lines.findIndex(line => line.includes('|') && !line.includes('---'));
    if (headerLineIndex === -1) {
        // If no headers are found, assume the entire content is just lines
        return (
            <div className='text-gray-700 leading-relaxed'>
                {content.split('\n').map((line, idx) => line.trim() && (
                    <p key={idx} className='mb-2'>{line}</p>
                ))}
            </div>
        );
    }

    const rawHeaders = lines[headerLineIndex].split('|').map(h => h.trim()).filter(h => h);
    
    // 3. Data starts after the header and separator line
    const dataRows = lines.slice(headerLineIndex + 2).filter(line => !line.includes('---')); 

    return (
        <div className="overflow-x-auto mt-2">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {rawHeaders.map((h, index) => (
                            <th
                                key={index}
                                className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {dataRows.map((line, rowIndex) => {
                        const columns = line.split('|').map(c => c.trim()).filter(c => c);
                        
                        // Only render if the number of columns matches the headers
                        if (columns.length !== rawHeaders.length) return null; 
                        
                        // Check if this row is a total/subtotal (for styling)
                        const isTotalRow = columns.some(c => /TOTAL|SUBTOTAL|GRAND\s*TOTAL|RANGE/i.test(c));

                        return (
                            <tr key={rowIndex} className={isTotalRow ? 'bg-yellow-50 font-semibold' : 'hover:bg-gray-50'}>
                                {columns.map((col, colIndex) => (
                                    <td
                                        key={colIndex}
                                        className={`px-3 py-2 text-sm text-gray-700 ${isTotalRow && colIndex === columns.length - 1 ? 'text-right text-lg text-blue-700' : 'text-left'}`}
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

     const [relatedQuestions, setRelatedQuestions] = useState([]); 

     const [textPrompt, setTextPrompt] = useState(''); 

     const [previewUrl, setPreviewUrl] = useState(null); 

     const [lastAnalysisInputType, setLastAnalysisInputType] = useState(null);

     const [fileType, setFileType] = useState(null);

    const [parsedSections, setParsedSections] = useState(null);

    // Supplier/Items catalog for AI context
    const [suppliers, setSuppliers] = useState([]);
    const [itemsCatalog, setItemsCatalog] = useState([]);
    const [includeSupplierCatalog, setIncludeSupplierCatalog] = useState(true);

    useEffect(() => {
        const loadCatalog = async () => {
            try {
                const [supRes, itemRes] = await Promise.all([
                    axiosInstance.get('/suppliers'),
                    axiosInstance.get('/items')
                ]);
                setSuppliers(Array.isArray(supRes.data) ? supRes.data : []);
                setItemsCatalog(Array.isArray(itemRes.data) ? itemRes.data : []);
            } catch (e) {
                console.error('Failed to load suppliers/items for AI context', e);
            }
        };
        loadCatalog();
    }, []);

    const supplierCatalogContext = useMemo(() => {
        if (!includeSupplierCatalog) return '';
        if (!Array.isArray(itemsCatalog) || itemsCatalog.length === 0) return '';
        // Build supplierId -> name map
        const supplierIdToName = new Map((suppliers || []).map(s => [String(s._id), s.name]));
        // Build compact catalog: for each item, list up to 3 supplier offers (name: price)
        const lines = [];
        let count = 0;
        for (const item of itemsCatalog) {
            const name = item?.name || '';
            const unit = item?.unit || '';
            const offers = Array.isArray(item?.supplierPrices) ? item.supplierPrices : [];
            if (name && offers.length > 0) {
                const mapped = offers
                    .map(o => ({
                        // FIX: Only use the supplier NAME if found, otherwise discard the offer for the context.
                        supplier: supplierIdToName.get(String(o.supplier)), 
                        price: Number(o.price) || 0
                    }))
                    .filter(o => o.supplier) // Only include offers where we found a valid name
                    .sort((a, b) => a.price - b.price)
                    .slice(0, 3);
                if (mapped.length > 0) {
                    const offerStr = mapped.map(o => `${o.supplier}: ${o.price}`).join(', ');
                    lines.push(`- ${name} (${unit}) -> ${offerStr}`);
                    count += 1;
                }
            }
            if (count >= 30) break; // keep prompt small
        }
        if (lines.length === 0) return '';
        return `\n**Available Supplier Catalog (PH Prices):** Prioritize recommending from these offers ONLY.
${lines.join('\n')}\n`;
    }, [includeSupplierCatalog, itemsCatalog, suppliers]);



     // --- HELPER FUNCTIONS --- 

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
             description: '',
             recommendations: '',
             budget: '',
             materials: '',
            analysis: '',
            supplierComparison: '',
            conclusion: ''
         };

         // Try to extract sections based on common patterns
         const lines = responseText.split('\n');
         let currentSection = 'description';
         let currentContent = [];

         for (let line of lines) {
             const trimmedLine = line.trim();
             
             // Check for section headers (look for **SECTION:** format or similar)
             if (trimmedLine.match(/^\*\*DESCRIPTION\*\*:?/i) || 
                 trimmedLine.toLowerCase().includes('description:') ||
                 trimmedLine.toLowerCase().includes('what it\'s all about') ||
                 trimmedLine.toLowerCase().includes('overview:')) {
                 if (currentContent.length > 0) {
                     sections[currentSection] = currentContent.join('\n').trim();
                 }
             } else if (trimmedLine.match(/^\*\*ANALYSIS\*\*:?/i) || 
                       trimmedLine.toLowerCase().includes('analysis:') ||
                       trimmedLine.toLowerCase().includes('measurement')) {
                 if (currentContent.length > 0) {
                     sections[currentSection] = currentContent.join('\n').trim();
                 }
                 currentSection = 'analysis';
                 currentContent = [];
            } else if (trimmedLine.match(/^\*\*MATERIALS?\s*&\s*RECOMMENDATIONS?\*\*:?/i) || 
                       trimmedLine.toLowerCase().includes('materials & recommendations:') ||
                       trimmedLine.toLowerCase().includes('materials and recommendations:') ||
                       trimmedLine.toLowerCase().includes('recommendation:') ||
                       trimmedLine.toLowerCase().includes('suggest:')) {
                 if (currentContent.length > 0) {
                     sections[currentSection] = currentContent.join('\n').trim();
                 }
                 currentSection = 'materials';
                 currentContent = [];
            } else if (trimmedLine.match(/^\*\*SUPPLIER\s*COMPARISON\*\*:?/i) ||
                       trimmedLine.toLowerCase().includes('supplier comparison:') ||
                       trimmedLine.toLowerCase().includes('comparison by supplier:')) {
                if (currentContent.length > 0) {
                    sections[currentSection] = currentContent.join('\n').trim();
                }
                currentSection = 'supplierComparison';
                currentContent = [];
             } else if (trimmedLine.match(/^\*\*BUDGET\s*ESTIMATE\*\*:?/i) || 
                       trimmedLine.toLowerCase().includes('budget estimate:') ||
                       trimmedLine.toLowerCase().includes('budget:') ||
                       trimmedLine.toLowerCase().includes('cost:') || 
                       trimmedLine.toLowerCase().includes('price:')) {
                 if (currentContent.length > 0) {
                     sections[currentSection] = currentContent.join('\n').trim();
                 }
                 currentSection = 'budget';
                 currentContent = [];
            } else if (trimmedLine.match(/^\*\*CONCLUSION\*\*:?/i) ||
                       trimmedLine.toLowerCase().includes('conclusion:') ||
                       trimmedLine.toLowerCase().includes('final recommendation:')) {
                if (currentContent.length > 0) {
                    sections[currentSection] = currentContent.join('\n').trim();
                }
                currentSection = 'conclusion';
                currentContent = [];
             } else if (trimmedLine.length > 0) {
                 currentContent.push(line);
             }
         }

         // Add the last section
         if (currentContent.length > 0) {
             sections[currentSection] = currentContent.join('\n').trim();
         }

         // If no specific sections found, put everything in description
        if (!sections.description && !sections.recommendations && !sections.budget && !sections.analysis && !sections.materials && !sections.supplierComparison && !sections.conclusion) {
             sections.description = responseText;
         }

         return sections;
     };



     // --- EVENT HANDLERS --- 

     const handleImageUpload = (e) => {
        if (e.target.files && e.target.files[0]) {
            const uploadedFile = e.target.files[0];
            
            // CHANGED: We now check the file type here.
            if (uploadedFile.type === "application/pdf") {
                setFileType('pdf');
            } else {
                setFileType('image');
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

         const fileInput = document.getElementById('image-upload'); 

         if (fileInput) fileInput.value = ''; 

     }; 

      

     const handleTextPromptChange = (e) => { 

         setTextPrompt(e.target.value); 

     }; 



     // --- CORE AI FUNCTIONS --- 

    const analyzeImage = async (additionalContextForAI = "") => { 

         if (!image) return; 



         setLoading(true); 

         resetResultsAndQuestions(); 



         const apiKey = "AIzaSyDngSNvIBkdTUccWLqDMIB2uElrG8_nROs"; 

         const genAI = new GoogleGenerativeAI(apiKey); 

         const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        
        // Heuristic check for relevance to construction cost/materials (to enable tables)
        const isCostRelevant = textPrompt.toLowerCase().includes('cost') || textPrompt.toLowerCase().includes('price') || textPrompt.toLowerCase().includes('budget') || textPrompt.toLowerCase().includes('supplier') || textPrompt.toLowerCase().includes('material') || textPrompt.toLowerCase().includes('php') || textPrompt.toLowerCase().includes('estimate');
        
        const costConstraint = isCostRelevant ? '' : 'If the query/image analysis is NOT relevant to material choice, cost, or suppliers, leave the MATERIALS, COMPARISON, BUDGET, and CONCLUSION sections BLANK.';


         try { 

             const imagePart = await fileToGenerativePart(image); 

              

            const fullPrompt = `Your task is to analyze the provided image and provide a structured response, focusing on the **Philippine construction context** (using PHP, local costs/practices). First, determine if the image is a construction blueprint, architectural drawing, or floor plan. 

             Please structure your response with clear section headers as follows:

             **DESCRIPTION:**
             Provide a clear description of what the image shows and what it's all about.

             **ANALYSIS:**
             If it's a blueprint or drawing, perform a detailed analysis including:
             - Check for potential measurement errors
             - Identify key structural elements
             - Note any design considerations
             ${costConstraint}

            **MATERIALS & RECOMMENDATIONS:**
            Recommended sustainable materials and construction approaches, using **Philippine market context**.
            - Format each material on a separate line with a hyphen (e.g., "- Material Name – Chosen Supplier: SUPPLIER_NAME (Reason: WHY) – brief justification").

            **SUPPLIER COMPARISON:**
            IMPORTANT: Output this section as a **Markdown Table** (using pipe '|' delimiters). Compare available suppliers from the Supplier Catalog for 3-5 key recommended materials. Include an overall total row.
            The table columns MUST be: **| Material | Supplier | Unit Price (PHP) | Pros/Cons (e.g., local, cheaper) |**
            End the table with a row showing the **OVERALL ESTIMATED SUBTOTAL** for each supplier (e.g., | OVERALL SUBTOTAL | Supplier A PHP Value | Supplier B PHP Value | BEST OPTION |). Do NOT mix suppliers in the final recommendation; this section is only for comparison.

            **BUDGET ESTIMATE:**
            IMPORTANT: Output this section as a **Markdown Table** (using pipe '|' delimiters). Provide a **realistic cost estimate**.
            **CRITICAL CONSTRAINT:** If the total area/scope is unknown, **assume a common scope, such as a 10 SQ.M. standard ceiling (3m x 3.33m) or a 50 SQ.M. floor area, and calculate quantities accurately for that assumed scope.** Use Philippines construction benchmarks (e.g., ₱20,000 to ₱30,000 per sq.m. for standard build) to guide overall pricing and ensure Unit Prices are realistic.
            The table columns MUST be: **| Item | Quantity (e.g., 12.00 pcs) | Unit | Unit Price (PHP) | Subtotal (PHP) |**
            Include a FINAL ROW for the Grand Total Cost.

            ${textPrompt.trim() ? `Also consider this specific user request: "${textPrompt.trim()}".` : ''} ${additionalContextForAI} ${supplierCatalogContext}

            **CONCLUSION:**
            Choose EXACTLY ONE supplier as the final recommendation for this project and state WHY (e.g., best total cost, sustainability, logistics). Do NOT recommend mixing suppliers. Keep it to 2-4 sentences.`; 



             const geminiResult = await model.generateContent([fullPrompt, imagePart]); 

             const responseText = geminiResult.response.text().trim().replace(/```/g, "").replace(/\*\*/g, "").replace(/\*/g, "").replace(/##/g, "").replace(/\n\s*\n/g, "\n"); 

              

             setResult(responseText);

             setLastAnalysisInputType('image');  

             generateKeywords(responseText);

             // Parse response into sections
             const sections = parseResponseIntoSections(responseText);
             setParsedSections(sections);



             // This logic is now smarter 

             if (responseText.trim().startsWith("Analysis:")) { 

                 await generateRelatedQuestions(responseText, 'blueprint_analysis'); 

             } else { 

                 await generateRelatedQuestions(responseText, 'image_description'); 

             } 



         } catch (error) { 

             console.error("Error during blueprint analysis:", error); 

             setResult(`Error during blueprint analysis: ${error?.message}`); 

         } finally { 

             setLoading(false); 

         } 

     }; 

      

    const analyzeTextPrompt = async (additionalContextForAI = "") => { 

         if (!textPrompt.trim()) return; 



         setLoading(true); 

         resetResultsAndQuestions(); 

         handleClearImage(); 



         const apiKey = "AIzaSyDngSNvIBkdTUccWLqDMIB2uElrG8_nROs"; 

         const genAI = new GoogleGenerativeAI(apiKey); 

         const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        // Heuristic check for relevance to construction cost/materials (to enable tables)
        const isCostRelevant = textPrompt.toLowerCase().includes('cost') || textPrompt.toLowerCase().includes('price') || textPrompt.toLowerCase().includes('budget') || textPrompt.toLowerCase().includes('supplier') || textPrompt.toLowerCase().includes('material') || textPrompt.toLowerCase().includes('php') || textPrompt.toLowerCase().includes('estimate');
        
        const costConstraint = isCostRelevant ? '' : 'If the query is NOT relevant to material choice, cost, or suppliers, leave the MATERIALS, COMPARISON, BUDGET, and CONCLUSION sections BLANK.';


         try { 

            const prompt = `As a construction and architectural expert, provide a concise recommendation or answer based on the following user query about construction. Focus on practical advice, sustainable practices, or cost-effectiveness within the **Philippine context**.
            ${costConstraint}

            **MATERIALS & RECOMMENDATIONS:**
            - You MAY suggest materials beyond the supplier catalog.
            - Format each material on a separate line with a hyphen.

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

            User Query: "${textPrompt.trim()}" ${additionalContextForAI} ${supplierCatalogContext}`; 



             const geminiResult = await model.generateContent([prompt]); 

             const responseText = geminiResult.response.text().trim().replace(/```/g, "").replace(/\*\*/g, "").replace(/\*/g, "").replace(/##/g, "").replace(/\n\s*\n/g, "\n"); 



             setResult(responseText);

             setLastAnalysisInputType('text'); 

             generateKeywords(responseText);

             // Parse response into sections
             const sections = parseResponseIntoSections(responseText);
             setParsedSections(sections);

             await generateRelatedQuestions(responseText, 'text_query');



         } catch (error) { 

             console.error('Error during text analysis:', error); 

             setResult(`Error during text analysis: ${error?.message}`); 

         } finally { 

             setLoading(false); 

         } 

     }; 

      

     const generateKeywords = (text) => { 

         const words = text.split(/\s+/); 

         const keywordsSet = new Set(); 

         words.forEach((word) => { 

             if (word.length > 4 && !["this", "that", "which", "from", "have"].includes(word.toLowerCase())) { 

                 keywordsSet.add(word.replace(/[.,:;]/g, '')); 

             } 

         }); 

         setKeywords(Array.from(keywordsSet).slice(0, 5)); 

     }; 



     const generateRelatedQuestions = async (responseText, type) => { 

         const apiKey = "AIzaSyDngSNvIBkdTUccWLqDMIB2uElrG8_nROs"; 

         const genAI = new GoogleGenerativeAI(apiKey); 

         const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });


         let questionPrompt = ''; 



         // --- UPDATED: Simplified Related Questions Prompt ---
         if (type === 'blueprint_analysis') { 
             questionPrompt = `Based on the analysis, generate 3 simple follow-up questions focused on cost, alternatives, or immediate next steps.`; 
         } else if (type === 'image_description') { 
             questionPrompt = `Based on the image description, generate 3 high-level questions about the project's feasibility or key features.`; 
         } else { // type === 'text_query' 
             questionPrompt = `Based on this construction advice, generate 3 practical, follow-up questions for more detail on implementation or budget impact.`; 
         } 



         try { 

             const geminiResult = await model.generateContent([ 

                 `${questionPrompt}\n\nOriginal Context: "${responseText}"\n\nGenerate the questions as a simple list, one per line.` 

             ]); 

             const questions = geminiResult.response.text().trim().split("\n").filter(q => q.trim() !== "" && q.length > 5); 

             setRelatedQuestions(questions); 

         } catch (error) { 

             console.error("Error generating related questions:", error); 

             setRelatedQuestions([]); 

         } 

     }; 



     const askRelatedQuestion = (question) => { 

         const fullQuestionPrompt = `Regarding the previous topic, please answer this specific question: "${question}".`; 

          

         if (lastAnalysisInputType === 'text') { 

             setTextPrompt(question); 

             analyzeTextPrompt(fullQuestionPrompt); 

         } else if (lastAnalysisInputType === 'image') { 

             setTextPrompt(question); 

             analyzeImage(fullQuestionPrompt); 

         } 

     }; 



     const regenerateContent = (keyword) => { 

         if (!image) return; 

         setTextPrompt(`Tell me more about '${keyword}' in relation to this blueprint.`); 

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

         <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'> 

             <div className='bg-white rounded-lg shadow-xl overflow-hidden'> 

                 <div className='p-8'> 

                     <h2 className='text-3xl font-extrabold text-gray-900 mb-8 text-center'> 

                         Construction AI Assistant 

                     </h2> 



                     <div className='mb-8'> 

                         <label htmlFor="image-upload" className='block text-lg font-medium text-gray-700 mb-2'> 

                             1. Upload a blueprint file for analysis  

                         </label> 

                         <input 

                             type="file" 

                             id='image-upload' 

                             accept=".png,.jpeg,.jpg,.pdf" 

                             onChange={handleImageUpload} 

                             className='block w-full text-sm to-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition' 

                             disabled={loading} 

                         /> 

                     </div> 



                     {previewUrl && (
                        <div className='mb-8 flex flex-col items-center relative'>
                            <button
                                type="button"
                                onClick={handleClearImage}
                                className='absolute -top-3 -right-3 bg-red-500 text-white rounded-full px-3 py-1 text-xs font-semibold shadow-md hover:bg-red-600 transition'
                                aria-label="Clear image"
                            >
                                Clear
                            </button>

                            {/* Conditionally render the correct preview based on file type */}
                            {fileType === 'pdf' ? (
                                <div className="w-full mt-2 p-4 border-2 border-gray-200 border-dashed rounded-lg flex items-center space-x-4 bg-gray-50">
                                    <FileText className="h-10 w-10 text-blue-600 flex-shrink-0" />
                                    <div className="overflow-hidden">
                                        <p className="text-sm font-medium text-gray-900 truncate" title={image.name}>
                                            {image.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {formatFileSize(image.size)}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <img
                                    src={previewUrl}
                                    alt="Uploaded Blueprint"
                                    className='rounded-lg shadow-md'
                                    style={{ objectFit: 'contain', maxHeight: '300px', width: 'auto' }}
                                />
                            )}
                        </div>
                    )}



                     <div className='text-center text-gray-500 text-sm my-8'> 

                         — AND/OR — 

                     </div> 



                     <div className='mb-8'> 

                         <label htmlFor="text-input" className='block text-lg font-medium text-gray-700 mb-2'> 

                             2. Provide additional details or ask a question 

                         </label> 

                         <textarea 

                             id="text-input" 

                             rows={4} 

                             className='block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500' 

                             placeholder="e.g., 'What are the best insulation materials for a tropical climate?' or 'Check the dimensions for the master bedroom on this blueprint.'" 

                             value={textPrompt} 

                             onChange={handleTextPromptChange} 

                             disabled={loading} 

                         ></textarea> 

                     </div> 



                     <button 

                         type="button" 

                         onClick={handleMainAnalyzeButtonClick} 

                         disabled={isButtonDisabled} 

                         className='w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg' 

                     > 

                         {getButtonText()} 

                     </button> 
<div className='text-center text-gray-500 text-sm my-5'> 

                        Enguinity can make mistakes, so double-check it

                     </div> 
                 </div> 



                 {(loading || result) && ( 

                     <div className='bg-blue-50 p-8 mt-8 rounded-lg border-t'> 

                         {loading && <p className="text-center text-blue-700 animate-pulse">Analyzing, please wait...</p>} 

                         {result && ( 

                             <> 

                                 <h3 className='text-2xl font-bold text-blue-800 mb-6'>Analysis Results</h3> 

                                 {/* Vertical Stacking Layout FIX: Using flex-col space-y-6 */}
                                 {parsedSections ? (
                                     <div className='flex flex-col space-y-6'>
                                         {/* Description Card - FULL WIDTH */}
                                         {parsedSections.description && (
                                             <div className='bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500'>
                                                 <h4 className='text-xl font-semibold text-gray-800 mb-3 flex items-center'>
                                                     <span className='bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mr-3'>📋</span>
                                                     Description
                                                 </h4>
                                                 <div className='text-gray-700 leading-relaxed'>
                                                     {parsedSections.description.split('\n').map((line, idx) => line.trim() && (
                                                         <p key={idx} className='mb-2'>{line}</p>
                                                     ))}
                                                 </div>
                                             </div>
                                         )}

                                         {/* Analysis Card - FULL WIDTH */}
                                         {parsedSections.analysis && (
                                             <div className='bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500'>
                                                 <h4 className='text-xl font-semibold text-gray-800 mb-3 flex items-center'>
                                                     <span className='bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium mr-3'>🔍</span>
                                                     Analysis
                                                 </h4>
                                                 <div className='text-gray-700 leading-relaxed'>
                                                     {parsedSections.analysis.split('\n').map((line, idx) => line.trim() && (
                                                         <p key={idx} className='mb-2'>{line}</p>
                                                     ))}
                                                 </div>
                                             </div>
                                         )}

                                        {/* Materials & Recommendations Card - FULL WIDTH */}
                                         {parsedSections.materials && (
                                             <div className='bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500'>
                                                 <h4 className='text-xl font-semibold text-gray-800 mb-3 flex items-center'>
                                                     <span className='bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium mr-3'>🔨</span>
                                                     Materials & Recommendations
                                                 </h4>
                                                 <div className='text-gray-700 leading-relaxed'>
                                                     {parsedSections.materials.split('\n').map((line, idx) => line.trim() && (
                                                         <p key={idx} className='mb-2'>{line}</p>
                                                     ))}
                                                 </div>
                                             </div>
                                         )}

                                        {/* Supplier Comparison Card (Table) - FULL WIDTH */}
                                        {parsedSections.supplierComparison && (
                                            <div className='bg-white rounded-lg shadow-md p-6 border-l-4 border-teal-500'>
                                                <h4 className='text-xl font-semibold text-gray-800 mb-3 flex items-center'>
                                                    <span className='bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm font-medium mr-3'>⚖️</span>
                                                    Supplier Comparison
                                                </h4>
                                                {renderTableSection(parsedSections.supplierComparison, 'Supplier Comparison')}
                                            </div>
                                        )}

                                        {/* Budget Card (Table) - FULL WIDTH */}
                                         {parsedSections.budget && (
                                             <div className='bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500'>
                                                 <h4 className='text-xl font-semibold text-gray-800 mb-3 flex items-center'>
                                                     <span className='bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium mr-3'>💰</span>
                                                     Budget Estimate
                                                 </h4>
                                                 {renderTableSection(parsedSections.budget, 'Budget Estimate')}
                                             </div>
                                         )}

                                        {/* Conclusion Card - FULL WIDTH */}
                                        {parsedSections.conclusion && (
                                            <div className='bg-white rounded-lg shadow-md p-6 border-l-4 border-rose-500'>
                                                <h4 className='text-xl font-semibold text-gray-800 mb-3 flex items-center'>
                                                    <span className='bg-rose-100 text-rose-800 px-3 py-1 rounded-full text-sm font-medium mr-3'>🏁</span>
                                                    Conclusion
                                                </h4>
                                                <div className='text-gray-700 leading-relaxed'>
                                                    {parsedSections.conclusion.split('\n').map((line, idx) => line.trim() && (
                                                        <p key={idx} className='mb-2'>{line}</p>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Recommendations Card (if separate from materials) - FULL WIDTH */}
                                         {parsedSections.recommendations && !parsedSections.materials && (
                                             <div className='bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500'>
                                                 <h4 className='text-xl font-semibold text-gray-800 mb-3 flex items-center'>
                                                     <span className='bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium mr-3'>💡</span>
                                                     Recommendations
                                                 </h4>
                                                 <div className='text-gray-700 leading-relaxed'>
                                                     {parsedSections.recommendations.split('\n').map((line, idx) => line.trim() && (
                                                         <p key={idx} className='mb-2'>{line}</p>
                                                     ))}
                                                 </div>
                                             </div>
                                         )}
                                     </div>
                                 ) : (
                                     /* Fallback to original display if parsing fails */
                                     <div className='space-y-2'> 
                                         {result.split("\n").map((line, idx) => line.trim() && ( 
                                             line.match(/^\d+\./) || line.startsWith("-") ? 
                                             <li key={idx} className='ml-4 text-gray-700'>{line}</li> : 
                                             <p key={idx} className='text-gray-800'>{line}</p> 
                                         ))} 
                                     </div>
                                 )} 

                                 
                                 {relatedQuestions.length > 0 && (
    <div className='mt-6'>
        {/* FIX: This H4 renders the non-clickable header */}
        <h4 className='text-lg font-semibold mb-2 text-blue-700'>Related Questions</h4> 
        
        {/* The AI's introductory phrase is likely still being rendered here and needs to be isolated */}
        
        <ul className='space-y-2'> 
            {relatedQuestions.map((question, index) => (
                <li key={index}>
                    <button type='button' onClick={() => askRelatedQuestion(question)} className='text-left w-full bg-blue-200 text-blue-800 px-4 py-2 rounded-lg hover:bg-blue-300'> 
                        {question.replace(/^[\s\d\.-]*\s*/, '')} 
                    </button> 
                </li>
            ))}
        </ul> 
    </div> 
)}

                             </> 

                         )} 

                     </div> 

                 )} 

             </div> 

              

             <section className="mt-16"> 

                 <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2> 

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8"> 

                     {["Upload Image", "AI Analysis", "Get Results"].map((step, idx) => ( 

                         <div key={idx} className="bg-white p-6 rounded-lg shadow-md text-center hover:scale-105 transform transition"> 

                             <div className="text-3xl font-bold text-blue-600 mb-4">{idx + 1}</div> 

                             <h3 className="text-xl font-semibold mb-2">{step}</h3> 

                             <p className="text-gray-600">Our AI analyzes your blueprint and provides recommendations quickly.</p> 

                         </div> 

                     ))} 

                 </div> 

             </section> 

         </main> 

     ); 

 }; 



 export default BlueprintPage;