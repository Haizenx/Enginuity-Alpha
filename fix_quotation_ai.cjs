const fs = require('fs');
const file = 'frontend/chat-front-end/src/components/QuotationForm.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import { axiosInstance } from "../lib/axios"')) {
  content = content.replace(
    'import { jsPDF } from "jspdf";',
    'import { jsPDF } from "jspdf";\nimport { axiosInstance } from "../lib/axios";\nimport { BrainCircuit } from "lucide-react";'
  );
} else {
  content = content.replace(
    'import { jsPDF } from "jspdf";',
    'import { jsPDF } from "jspdf";\nimport { BrainCircuit } from "lucide-react";'
  );
}

const aiImportLogic = `
  const [aiHistories, setAiHistories] = useState([]);
  const [showAiModal, setShowAiModal] = useState(false);

  const fetchAiHistory = async () => {
    try {
      const res = await axiosInstance.get("/gemini/history");
      setAiHistories(res.data);
      setShowAiModal(true);
    } catch (e) {
      toast.error("Failed to fetch AI history");
    }
  };

  const handleImportAi = (history) => {
    try {
      // Very basic parsing: look for markdown table rows that might be materials
      const text = history.response || "";
      const lines = text.split("\\n");
      const tableLines = lines.filter(l => l.includes("|") && !l.includes("---"));
      
      let importedCount = 0;
      tableLines.forEach(line => {
         const parts = line.split("|").map(s => s.trim()).filter(Boolean);
         // Typically: | Material | Quantity | Unit Price | ...
         if (parts.length >= 2 && !parts[0].toLowerCase().includes("material")) {
            const matName = parts[0];
            const qtyRaw = parts[1].replace(/[^0-9.]/g, '');
            const qty = parseFloat(qtyRaw) || 1;
            
            // Try to match with existing items
            const matchedItem = items.find(i => i.name.toLowerCase().includes(matName.toLowerCase()));
            if (matchedItem) {
               handleQuantityChange(matchedItem._id, qty);
               importedCount++;
            }
         }
      });
      
      if (importedCount > 0) {
        toast.success(\`Imported \${importedCount} materials from AI\`);
      } else {
        toast.error("Could not parse materials from this AI analysis or none matched your master list.");
      }
      setShowAiModal(false);
    } catch (error) {
      toast.error("Error parsing AI data");
    }
  };
`;

content = content.replace(
  'const QuotationForm = ({ selectedProject, items, onClose }) => {',
  `const QuotationForm = ({ selectedProject, items, onClose }) => {\n${aiImportLogic}`
);

// Add the button
const buttonUI = `
        <div className="flex justify-between items-center mb-6">
           <h3 className="text-xl font-bold text-slate-800">New Quotation</h3>
           <button type="button" onClick={fetchAiHistory} className="btn btn-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border-0 gap-2 rounded-xl">
              <BrainCircuit size={16} /> Auto-fill from AI
           </button>
        </div>
`;

content = content.replace(
  '<h3 className="text-xl font-bold text-slate-800 mb-6">New Quotation</h3>',
  buttonUI
);

// Add modal UI to the bottom
const modalUI = `
      {/* AI Import Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center">
               <h3 className="text-xl font-bold flex items-center gap-2"><BrainCircuit className="text-indigo-600"/> Select AI Analysis to Import</h3>
               <button onClick={() => setShowAiModal(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full">&times;</button>
             </div>
             <div className="p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-3">
                {aiHistories.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No AI analysis history found.</p>
                ) : (
                  aiHistories.map(h => (
                    <div key={h._id} onClick={() => handleImportAi(h)} className="p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all bg-slate-50 hover:bg-white group">
                       <p className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{h.prompt}</p>
                       <p className="text-xs text-slate-500 mt-1">{new Date(h.createdAt).toLocaleString()}</p>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>
      )}
`;

content = content.replace(
  '</form>',
  '</form>\n' + modalUI
);

fs.writeFileSync(file, content);
console.log('AI logic added to QuotationForm');
