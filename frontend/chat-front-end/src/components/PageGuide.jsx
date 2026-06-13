import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { HelpCircle, X, Info, CheckCircle2 } from "lucide-react";

const GUIDE_CONTENT = {
  "/dashboard": {
    title: "Dashboard Overview",
    description: "Welcome to your command center. Here you can monitor overall project progress and quick metrics.",
    features: [
      "View high-level statistics for all active projects.",
      "Quickly navigate to your most recent chats and updates.",
      "Monitor overall progress across your firm."
    ]
  },
  "/projects": {
    title: "Project Management",
    description: "Manage your construction projects, track phases, and automate workflows.",
    features: [
      "Create new projects and specify duration.",
      "Auto-generate standard construction phases and timelines.",
      "Track completion status of individual activities.",
      "Click into any project for deep-dive details."
    ]
  },
  "/chats": {
    title: "Team Communications",
    description: "Real-time messaging platform tailored for your construction team.",
    features: [
      "Send instant messages and share files securely.",
      "Initiate crystal-clear video calls with team members.",
      "Unread badges keep you updated on important conversations."
    ]
  },
  "/blueprint": {
    title: "AI Blueprint Assistant",
    description: "Leverage artificial intelligence to accelerate your architectural planning.",
    features: [
      "Generate initial design concepts instantly.",
      "Analyze structural requirements and building codes.",
      "Export AI drafts to integrate with standard CAD tools."
    ]
  },
  "/quotation": {
    title: "Quotation & Estimates",
    description: "Generate professional cost estimates and quotations for clients.",
    features: [
      "Build detailed itemized cost breakdowns.",
      "Apply standard margins and tax calculations.",
      "Export professional PDF quotes for client approval."
    ]
  },
  "/payroll": {
    title: "Payroll Management",
    description: "Track hours and manage compensation for your on-site teams.",
    features: [
      "Log worker hours and calculate overtime.",
      "Generate payroll summaries per project.",
      "Maintain historical records of all payments."
    ]
  },
  "/file-handling": {
    title: "Document Vault",
    description: "Secure, centralized storage for all your project files.",
    features: [
      "Upload plans, permits, and site photos.",
      "Organize documents by project folder.",
      "Ensure team members always have the latest revisions."
    ]
  },
  "/settings": {
    title: "System Settings",
    description: "Personalize your experience and secure your account.",
    features: [
      "Change your primary login password securely.",
      "Set a dedicated Recovery Email for password resets.",
      "Switch between different visual color themes."
    ]
  },
  "/profile": {
    title: "User Profile",
    description: "Manage your personal information and presence.",
    features: [
      "Update your display name and contact details.",
      "Upload or change your profile avatar."
    ]
  },
  "/superadmin/accounts": {
    title: "Manage Accounts",
    description: "Superadmin control center for system-wide access management.",
    features: [
      "Create new Project Manager or Client accounts.",
      "Force-reset passwords securely for users locked out.",
      "Deactivate or permanently delete rogue accounts."
    ]
  }
};

const PageGuide = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Find the most specific matching route
  // We use startsWith to handle sub-routes like /projects/123
  const currentPath = location.pathname;
  let activeGuide = null;
  
  // Exact match first
  if (GUIDE_CONTENT[currentPath]) {
    activeGuide = GUIDE_CONTENT[currentPath];
  } else {
    // Prefix match (e.g., /projects/123 -> /projects)
    const matchingKey = Object.keys(GUIDE_CONTENT).find(
      key => currentPath.startsWith(key) && key !== "/"
    );
    if (matchingKey) {
      activeGuide = GUIDE_CONTENT[matchingKey];
    }
  }

  // Close the modal automatically if the user navigates
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  if (!activeGuide) return null; // No guide available for this route

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[60] w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-indigo-700 hover:scale-110 transition-all duration-300 group"
        aria-label="Open Page Guide"
        title="Page Guide"
      >
        <HelpCircle size={28} className="group-hover:rotate-12 transition-transform duration-300" />
      </button>

      {/* Guide Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            onClick={() => setIsOpen(false)} 
            aria-hidden="true" 
          />
          
          <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-lg p-8 z-10 border border-slate-100 scale-in-center">
            
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                 <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                    <Info size={24} />
                 </div>
                 <div>
                   <h3 className="font-black text-2xl tracking-tight text-slate-800">
                     {activeGuide.title}
                   </h3>
                   <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md mt-1 inline-block">
                     Page Guide
                   </span>
                 </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors mt-1"
              >
                <X size={16} strokeWidth={3} />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-6">
              <p className="text-slate-600 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                {activeGuide.description}
              </p>

              <div>
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 ml-1">Key Features</h4>
                <ul className="space-y-3">
                  {activeGuide.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="mt-0.5 min-w-[20px]">
                         <CheckCircle2 size={18} className="text-emerald-500" />
                      </div>
                      <span className="text-sm font-medium text-slate-600 leading-snug">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
              <button 
                className="px-6 py-3 rounded-xl font-bold tracking-wide text-sm bg-slate-800 text-white hover:bg-slate-700 transition-all shadow-sm w-full sm:w-auto"
                onClick={() => setIsOpen(false)}
              >
                Got it, thanks!
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default PageGuide;
