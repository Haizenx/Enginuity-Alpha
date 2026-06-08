import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore.js";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { 
  Building2, 
  UserPlus, 
  FolderPlus, 
  LayoutDashboard, 
  Users2, 
  Plus, 
  X, 
  CheckCircle2, 
  AlertCircle,
  FolderKanban
} from "lucide-react";

export default function SuperAdminDashboard() {
  const { authUser } = useAuthStore();

  // Modals
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isProjectManagerModalOpen, setIsProjectManagerModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // Row PM chooser modal state
  const [pmChooserFor, setPmChooserFor] = useState(null); // projectId or null
  const [pmChooserSelection, setPmChooserSelection] = useState("");
  const [currentProjectManagers, setCurrentProjectManagers] = useState([]); // Track current PMs for the project

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms
  const [clientForm, setClientForm] = useState({
    clientName: "",
    email: "",               
    contactNumber: "",
    location: "",
    description: "",
    startDate: "",
    endDate: "",
  });

  const [projectManagerForm, setProjectManagerForm] = useState({
    fullName: "",
    email: "",               
    contactNumber: "",
  });

  const [projectForm, setProjectForm] = useState({
    clientId: "",
    projectManagerId: "",
    description: "",
    location: "",
    contactNumber: "",
    startDate: "",
    targetDeadline: "",
  });

  // Data lists
  const [clients, setClients] = useState([]);
  const [projectManagers, setProjectManagers] = useState([]);
  const [projects, setProjects] = useState([]);

  // Modal helpers
  const openClientModal = () => setIsClientModalOpen(true);
  const closeClientModal = () => setIsClientModalOpen(false);
  const openProjectManagerModal = () => setIsProjectManagerModalOpen(true);
  const closeProjectManagerModal = () => setIsProjectManagerModalOpen(false);
  const openProjectModal = () => setIsProjectModalOpen(true);
  const closeProjectModal = () => setIsProjectModalOpen(false);

  // Fetchers
  const fetchClients = async () => {
    try {
      const res = await axiosInstance.get("/users/clients");
      const payload = res.data;
      const list = Array.isArray(payload) ? payload : (payload?.clients || payload?.data || []);
      setClients(list || []);
    } catch (err) {
      console.error("Failed to fetch clients", err);
      setClients([]);
    }
  };

  const fetchProjectManagers = async () => {
    try {
      const res = await axiosInstance.get("/users/project-managers");
      const payload = res.data;
      const list = Array.isArray(payload) ? payload : (payload?.projectManagers || payload?.data || []);
      setProjectManagers(list || []);
    } catch (err) {
      console.error("Failed to fetch project managers", err);
      setProjectManagers([]);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await axiosInstance.get("/projects");
      const payload = res.data;
      const list = Array.isArray(payload) ? payload : (payload?.projects || payload?.data || []);
      setProjects(list || []);
    } catch (err) {
      console.error("Failed to fetch projects", err);
      setProjects([]);
    }
  };

  // Initial load
  useEffect(() => {
    fetchClients();
    fetchProjectManagers();
    fetchProjects();
  }, []);

  // Auth guard
  if (authUser?.role !== "superadmin") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-8 rounded-3xl shadow-sm flex flex-col items-center gap-4 max-w-md text-center">
           <AlertCircle className="w-12 h-12 text-rose-500" />
           <h2 className="text-xl font-black tracking-tight">Unauthorized Access</h2>
           <p className="font-medium text-rose-600">You must be a super admin to view this page.</p>
        </div>
      </div>
    );
  }

  // Auto-fill project fields on client select
  const handleProjectFieldChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...projectForm, [name]: value };

    if (name === "clientId") {
      const selected = clients.find((c) => c._id === value);
      if (selected) {
        updated.location = selected.location || "";
        updated.description = selected.description || "";
        updated.contactNumber = selected.contactNumber || "";
        updated.startDate = selected.startDate ? String(selected.startDate).slice(0, 10) : "";
        updated.targetDeadline = selected.endDate ? String(selected.endDate).slice(0, 10) : "";
      }
    }

    setProjectForm(updated);
  };

  // Create Client (auto username: ...@eng.client)
  const handleCreateClient = async (e) => {
    e.preventDefault();

    const { clientName, email, contactNumber, location, description, startDate, endDate } = clientForm;
    if (!clientName.trim()) return toast.error("Client name is required");
    if (!email.trim()) return toast.error("Client email is required");                 
    if (!contactNumber.trim()) return toast.error("Contact number is required");
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) return toast.error("Start date cannot be after end date");

    setIsSubmitting(true);
    try {
      const { data } = await axiosInstance.post("/users/create-client-auto", {
        fullName: clientName.trim(),
        email: email.trim(),                                       
        contactNumber: contactNumber.trim(),
        location: location.trim(),
        description: description.trim(),
        startDate,
        endDate,
      });

      toast.success(data?.message || "Client created");

      // Persist emailSent for modal badge
      const creds = data?.credentials || {};
      setCreatedCreds({
        email: creds.email,
        username: creds.username,
        password: creds.password,
        emailSent: data?.emailSent === true,                       
      });

      setIsClientModalOpen(false);
      setClientForm({
        clientName: "",
        email: "",                                                 
        contactNumber: "",
        location: "",
        description: "",
        startDate: "",
        endDate: "",
      });

      // Email status toast
      if (data?.emailSent) {
        toast.success("Credentials emailed to the client.");
      } else {
        toast("Client created; emailing credentials failed. Share manually.", { icon: "✉️" });
      }

      await fetchClients();
      await fetchProjects();
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to create client";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create Project Manager (auto username: ...@eng.pmanager)
  const handleCreateProjectManager = async (e) => {
    e.preventDefault();

    const { fullName, email, contactNumber } = projectManagerForm;
    if (!fullName.trim()) return toast.error("Project Manager name is required");
    if (!email.trim()) return toast.error("Project Manager email is required");       
    if (!contactNumber.trim()) return toast.error("Contact number is required");

    setIsSubmitting(true);
    try {
      const { data } = await axiosInstance.post("/users/create-pm-auto", {
        fullName: fullName.trim(),
        email: email.trim(),                                     
        contactNumber: contactNumber.trim(),
      });
      toast.success(data?.message || "Project Manager created");

      // Email status toast
      if (data?.emailSent) {
        toast.success("Credentials emailed to the project manager.");
      } else {
        toast("PM created; emailing credentials failed. Share manually.", { icon: "✉️" });
      }

      await fetchProjectManagers();
      const newPmId = data?.user?._id;
      if (isProjectModalOpen && newPmId) {
        setProjectForm((prev) => ({ ...prev, projectManagerId: newPmId }));
      }

      setIsProjectManagerModalOpen(false);
      setProjectManagerForm({ fullName: "", email: "", contactNumber: "" });         
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to create project manager";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create Project
  const handleCreateProject = async (e) => {
    e.preventDefault();
    const { clientId, projectManagerId, description, location, contactNumber, startDate, targetDeadline } = projectForm;

    if (!clientId) return toast.error("Please select a client");
    if (!projectManagerId) return toast.error("Please select a project manager");
    if (!location.trim()) return toast.error("Location is required");
    if (!description.trim()) return toast.error("Description is required");
    if (!startDate) return toast.error("Start date is required");
    if (!targetDeadline) return toast.error("Target deadline is required");
    if (new Date(startDate) > new Date(targetDeadline)) return toast.error("Start date cannot be after target deadline");

    setIsSubmitting(true);
    try {
      await axiosInstance.post("/projects", {
        clientId,
        projectManagerId,
        description: description.trim(),
        location: location.trim(),
        contactNumber: contactNumber.trim(),
        startDate,
        targetDeadline,
      });
      toast.success("Project created successfully");

      setIsProjectModalOpen(false);
      setProjectForm({
        clientId: "",
        projectManagerId: "",
        description: "",
        location: "",
        contactNumber: "",
        startDate: "",
        targetDeadline: "",
      });

      await fetchProjects();
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to create project";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add PM to project (multi-PM via projectExtras)
  const handleAddPMToProject = async (projectId, managerId) => {
    try {
      const { data: updatedProject } = await axiosInstance.put(
        `/projects/${projectId}/add-pms`,
        { managerIds: [managerId] }
      );
      setProjects((prev) => prev.map((p) => (p._id === projectId ? updatedProject : p)));
      toast.success("Project Manager added");
    } catch (error) {
      console.error("Error adding PM:", error);
      toast.error(error?.response?.data?.message || "Failed to add PM");
    }
  };

  // Remove PM from project
  const handleRemovePMFromProject = async (projectId, managerId) => {
    try {
      await axiosInstance.put(`/projects/${projectId}/remove-pms`, { managerIds: [managerId] });
      toast.success("Project Manager removed");
      await fetchProjects();
      
      // Update local chooser state so the UI reflects the removal immediately
      setCurrentProjectManagers(prev => prev.filter(id => id !== managerId));
    } catch (err) {
      console.error("Error removing PM from project:", err);
      toast.error("Failed to remove Project Manager");
    }
  };

  // PM chooser modal open/close
  const openPMChooserFor = (projectId) => {
    const project = projects.find((p) => p._id === projectId);
    if (project) {
      const currentPMs = [];

      // Primary PM
      if (project.projectManager || project.projectManagerId) {
        const primary = typeof project.projectManager === "object"
          ? project.projectManager
          : projectManagers.find((x) => x._id === (project.projectManagerId || project.projectManager));
        if (primary) currentPMs.push(primary._id);
      }

      // Extras
      if (Array.isArray(project.projectExtras)) {
        project.projectExtras.forEach((pm) => {
          const pmId = typeof pm === "object" ? pm._id : pm;
          if (pmId && !currentPMs.includes(pmId)) currentPMs.push(pmId);
        });
      }

      setCurrentProjectManagers(currentPMs);
    }

    setPmChooserFor(projectId);
    setPmChooserSelection("");
  };

  const closePMChooser = () => {
    setPmChooserFor(null);
    setPmChooserSelection("");
    setCurrentProjectManagers([]);
  };

  const statusBadgeStyle = (label) => {
    switch (label) {
      case "Ongoing":
        return "bg-indigo-50 text-indigo-600 border border-indigo-100";
      case "Completed":
        return "bg-emerald-50 text-emerald-600 border border-emerald-100";
      case "Finishing":
        return "bg-amber-50 text-amber-600 border border-amber-100";
      case "Planning":
      case "Preparing":
      default:
        return "bg-slate-100 text-slate-600 border border-slate-200";
    }
  };

  // Table helpers
  const getClientName = (proj) => {
    if (!proj) return "-";
    if (proj.clientId && typeof proj.clientId === "object") return proj.clientId.fullName || proj.clientId.name || "-";
    const id = typeof proj.clientId === "string" ? proj.clientId : (proj.client?._id || proj.clientId);
    const found = clients.find((c) => c._id === id);
    return found?.fullName || found?.name || "-";
  };

  const getProjectManagers = (proj) => {
    const pms = [];

    const mainPM = (proj.projectManager && typeof proj.projectManager === "object")
      ? proj.projectManager
      : projectManagers.find((x) => x._id === (proj.projectManagerId || proj.projectManager));
    if (mainPM) pms.push(mainPM);

    if (Array.isArray(proj.projectExtras)) {
      proj.projectExtras.forEach((pm) => {
        const pmObj = typeof pm === "object" ? pm : projectManagers.find((x) => x._id === pm);
        if (pmObj && !pms.find((p) => p._id === pmObj._id)) pms.push(pmObj);
      });
    }

    return pms;
  };

  const safeProjects = Array.isArray(projects) ? projects : [];

  // Input styling
  const inputClassName = "bg-slate-50 border border-slate-200 text-slate-800 font-medium text-sm rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm w-full transition-colors focus:bg-white";

  // Render
  return (
    <main className="min-h-screen w-full bg-slate-50/50 relative py-12 px-4 sm:px-6 lg:px-8 pb-32">
      {/* Ambient Background Blobs */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-200/40 rounded-full blur-[120px] mix-blend-multiply pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-200/40 rounded-full blur-[120px] mix-blend-multiply pointer-events-none" />

      <div className="max-w-[1400px] mx-auto relative z-10">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <div className="w-16 h-16 bg-slate-800 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-slate-800/20">
             <LayoutDashboard size={32} />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight">System Control</h1>
            <p className="text-lg font-medium text-slate-500 mt-2">Manage clients, project managers, and project creation.</p>
          </div>
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
           <button 
             onClick={openClientModal}
             className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col items-center text-center relative overflow-hidden"
           >
              <div className="absolute -inset-8 bg-gradient-to-tr from-sky-100/50 to-indigo-100/50 opacity-0 group-hover:opacity-100 transition-opacity blur-2xl"></div>
              <div className="w-16 h-16 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center mb-4 relative z-10 group-hover:scale-110 transition-transform">
                 <Building2 size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 relative z-10">New Client</h3>
              <p className="text-sm font-medium text-slate-500 mt-2 relative z-10">Register a new client profile</p>
           </button>

           <button 
             onClick={openProjectManagerModal}
             className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col items-center text-center relative overflow-hidden"
           >
              <div className="absolute -inset-8 bg-gradient-to-tr from-emerald-100/50 to-teal-100/50 opacity-0 group-hover:opacity-100 transition-opacity blur-2xl"></div>
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-4 relative z-10 group-hover:scale-110 transition-transform">
                 <Users2 size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 relative z-10">New Manager</h3>
              <p className="text-sm font-medium text-slate-500 mt-2 relative z-10">Create a project manager account</p>
           </button>

           <button 
             onClick={() => {
                fetchClients();
                fetchProjectManagers();
                fetchProjects();
                openProjectModal();
             }}
             className="bg-indigo-600 p-8 rounded-[2rem] shadow-lg shadow-indigo-600/20 hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col items-center text-center relative overflow-hidden"
           >
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-16 h-16 bg-white/20 text-white rounded-2xl flex items-center justify-center mb-4 relative z-10 group-hover:scale-110 transition-transform backdrop-blur-md">
                 <FolderPlus size={32} />
              </div>
              <h3 className="text-xl font-black text-white relative z-10">Create Project</h3>
              <p className="text-sm font-medium text-indigo-100 mt-2 relative z-10">Initialize a new construction project</p>
           </button>
        </div>

        {/* Master Project Table */}
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white shadow-sm animate-in fade-in duration-500">
           <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
              <div className="w-2 h-8 bg-indigo-400 rounded-full"></div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Active Projects Registry</h2>
           </div>

           <div className="overflow-x-auto rounded-[1.5rem] border border-slate-100 shadow-sm bg-white">
             <table className="w-full text-left whitespace-nowrap">
               <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-widest">
                 <tr>
                   <th className="py-4 px-6">Client</th>
                   <th className="py-4 px-6">Description</th>
                   <th className="py-4 px-6">Project Managers</th>
                   <th className="py-4 px-6">Status</th>
                   <th className="py-4 px-6">Timeline</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {safeProjects.length === 0 ? (
                   <tr>
                     <td colSpan={5} className="text-center py-12 text-slate-500 font-medium">
                        <FolderKanban className="w-8 h-8 mx-auto text-slate-300 mb-3" />
                        No projects registered yet.
                     </td>
                   </tr>
                 ) : (
                   safeProjects.map((p) => {
                     const assignedPMs = getProjectManagers(p);
                     const statusValue = (p.status || "").toLowerCase();
                     const statusLabel = statusValue === "in_progress" ? "Ongoing"
                       : statusValue === "completed" ? "Completed"
                       : statusValue === "finishing" ? "Finishing"
                       : statusValue === "preparing" ? "Preparing"
                       : statusValue === "planning" ? "Planning"
                       : "Preparing";
       
                     return (
                       <tr key={p._id} className="hover:bg-slate-50/50 transition-colors">
                         <td className="py-4 px-6 font-bold text-slate-800">{getClientName(p)}</td>
                         <td className="py-4 px-6">
                            <div className="max-w-[250px] truncate text-sm font-medium text-slate-500" title={p.description}>
                               {p.description || "-"}
                            </div>
                         </td>
       
                         <td className="py-4 px-6">
                           <div className="flex items-center gap-2">
                             {assignedPMs.length === 0 ? (
                               <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-md">Unassigned</span>
                             ) : (
                               <div className="flex flex-wrap gap-1">
                                 {assignedPMs.map((pm) => (
                                   <span key={pm._id} className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-bold">
                                     {pm.fullName || pm.name}
                                   </span>
                                 ))}
                               </div>
                             )}
                             <button
                               type="button"
                               className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-colors flex-shrink-0 shadow-sm border border-indigo-100"
                               title="Manage Managers"
                               onClick={() => openPMChooserFor(p._id)}
                             >
                               <Plus size={14} strokeWidth={3} />
                             </button>
                           </div>
                         </td>
       
                         <td className="py-4 px-6">
                           <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${statusBadgeStyle(statusLabel)}`}>
                             {statusLabel}
                           </span>
                         </td>
       
                         <td className="py-4 px-6">
                           <div className="flex flex-col gap-1">
                              <span className="text-xs font-bold text-slate-500">Start: {p.startDate ? String(p.startDate).slice(0, 10) : "-"}</span>
                              <span className="text-xs font-bold text-slate-700">Due: {p.targetDeadline ? String(p.targetDeadline).slice(0, 10) : "-"}</span>
                           </div>
                         </td>
                       </tr>
                     );
                   })
                 )}
               </tbody>
             </table>
           </div>
        </div>
      </div>

      {/* ---------- Modals ---------- */}

      {/* Client Modal */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeClientModal} />
          <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl p-8 z-10 border border-slate-100 scale-in-center max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
               <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600">
                  <Building2 size={24} />
               </div>
               <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Create Client Profile</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">Username and temp password will be generated automatically.</p>
               </div>
            </div>
            
            <form className="space-y-4" onSubmit={handleCreateClient}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Client Name *</label>
                    <input type="text" className={inputClassName} placeholder="Acme Corp" value={clientForm.clientName} onChange={(e) => setClientForm({ ...clientForm, clientName: e.target.value.replace(/[0-9]/g, "") })} required />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Email *</label>
                    <input type="email" className={inputClassName} placeholder="client@acme.com" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} required />
                 </div>
              </div>
              
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Contact Number *</label>
                 <input type="tel" className={inputClassName} placeholder="+63 917 000 0000" value={clientForm.contactNumber} onChange={(e) => setClientForm({ ...clientForm, contactNumber: e.target.value })} required />
              </div>

              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Location (Optional)</label>
                 <input type="text" className={inputClassName} placeholder="Site address..." value={clientForm.location} onChange={(e) => setClientForm({ ...clientForm, location: e.target.value })} />
              </div>

              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Description (Optional)</label>
                 <textarea className={`${inputClassName} min-h-[80px]`} placeholder="Client details..." value={clientForm.description} onChange={(e) => setClientForm({ ...clientForm, description: e.target.value })} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Contract Start (Optional)</label>
                    <input type="date" className={inputClassName} value={clientForm.startDate} onChange={(e) => setClientForm({ ...clientForm, startDate: e.target.value })} />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Contract End (Optional)</label>
                    <input type="date" className={inputClassName} value={clientForm.endDate} onChange={(e) => setClientForm({ ...clientForm, endDate: e.target.value })} />
                 </div>
              </div>
          
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                <button type="button" className="px-6 py-3 rounded-xl font-bold tracking-wide text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors" onClick={closeClientModal} disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="px-6 py-3 rounded-xl font-bold tracking-wide text-sm bg-sky-500 text-white hover:bg-sky-600 transition-all shadow-sm flex items-center gap-2" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Manager Modal */}
      {isProjectManagerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeProjectManagerModal} />
          <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 z-10 border border-slate-100 scale-in-center">
            <div className="flex items-center gap-3 mb-6">
               <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                  <UserPlus size={24} />
               </div>
               <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Create Manager</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">Temp credentials generated on creation.</p>
               </div>
            </div>

            <form className="space-y-4" onSubmit={handleCreateProjectManager}>
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Full Name *</label>
                 <input type="text" className={inputClassName} placeholder="John Doe" value={projectManagerForm.fullName} onChange={(e) => setProjectManagerForm({ ...projectManagerForm, fullName: e.target.value.replace(/[0-9]/g, "") })} required />
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Email *</label>
                 <input type="email" className={inputClassName} placeholder="john@email.com" value={projectManagerForm.email} onChange={(e) => setProjectManagerForm({ ...projectManagerForm, email: e.target.value })} required />
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Contact Number *</label>
                 <input type="tel" className={inputClassName} placeholder="+63 917 000 0000" value={projectManagerForm.contactNumber} onChange={(e) => setProjectManagerForm({ ...projectManagerForm, contactNumber: e.target.value })} required />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                <button type="button" className="px-6 py-3 rounded-xl font-bold tracking-wide text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors" onClick={closeProjectManagerModal} disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="px-6 py-3 rounded-xl font-bold tracking-wide text-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-sm flex items-center gap-2" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Manager"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeProjectModal} />
          <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl p-8 z-10 border border-slate-100 scale-in-center max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
               <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                  <FolderPlus size={24} />
               </div>
               <h3 className="text-2xl font-black text-slate-800 tracking-tight">Initialize Project</h3>
            </div>

            <form className="space-y-4" onSubmit={handleCreateProject}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Assign Client *</label>
                    <select className={`${inputClassName} cursor-pointer`} name="clientId" value={projectForm.clientId} onChange={handleProjectFieldChange} required>
                      <option value="" disabled>Select a client</option>
                      {clients.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.fullName || c.name} {c.email ? `(${c.email})` : ""}
                        </option>
                      ))}
                    </select>
                 </div>
                 
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Lead Project Manager *</label>
                    <div className="flex gap-2">
                      <select className={`${inputClassName} cursor-pointer flex-1`} name="projectManagerId" value={projectForm.projectManagerId} onChange={handleProjectFieldChange} required>
                        <option value="" disabled>Select a manager</option>
                        {projectManagers.map((pm) => (
                          <option key={pm._id} value={pm._id}>
                            {pm.fullName || pm.name}
                          </option>
                        ))}
                      </select>
                      <button type="button" className="w-[52px] h-[52px] flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-colors border border-emerald-100 shadow-sm flex-shrink-0" title="Quick add manager" onClick={() => setIsProjectManagerModalOpen(true)}>
                        <Plus size={20} strokeWidth={3} />
                      </button>
                    </div>
                 </div>
              </div>

              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Location *</label>
                 <input type="text" className={inputClassName} name="location" placeholder="Site address" value={projectForm.location} onChange={handleProjectFieldChange} required />
              </div>

              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Description *</label>
                 <textarea className={`${inputClassName} min-h-[100px]`} name="description" placeholder="Project details and scope..." value={projectForm.description} onChange={handleProjectFieldChange} required />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Contact Number *</label>
                   <input type="text" className={inputClassName} name="contactNumber" placeholder="+63..." value={projectForm.contactNumber} onChange={handleProjectFieldChange} required />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Start Date *</label>
                    <input type="date" className={inputClassName} name="startDate" value={projectForm.startDate} onChange={handleProjectFieldChange} required />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Target Deadline *</label>
                    <input type="date" className={inputClassName} name="targetDeadline" value={projectForm.targetDeadline} onChange={handleProjectFieldChange} required />
                 </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                <button type="button" className="px-6 py-3 rounded-xl font-bold tracking-wide text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors" onClick={closeProjectModal} disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="px-6 py-3 rounded-xl font-bold tracking-wide text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2" disabled={isSubmitting}>
                  {isSubmitting ? "Initializing..." : "Initialize Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage PMs on Project Modal */}
      {pmChooserFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closePMChooser} />
          <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-lg p-8 z-10 border border-slate-100 scale-in-center">
            <div className="flex items-center gap-3 mb-6">
               <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                  <Users2 size={24} />
               </div>
               <h3 className="text-2xl font-black text-slate-800 tracking-tight">Assign Managers</h3>
            </div>

            <div className="mb-8">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 ml-1">Currently Assigned</label>
              {currentProjectManagers.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                   <p className="text-sm font-medium text-slate-500">No managers assigned.</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {currentProjectManagers.map((pmId) => {
                    const pm = projectManagers.find((p) => p._id === pmId);
                    return (
                      <div key={pmId} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-2 rounded-xl border border-indigo-100 font-bold text-sm shadow-sm">
                        <span>{pm?.fullName || pm?.name || "Unknown PM"}</span>
                        <button
                          type="button"
                          className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-indigo-200 text-indigo-400 hover:text-indigo-800 transition-colors"
                          onClick={() => handleRemovePMFromProject(pmChooserFor, pmId)}
                        >
                          <X size={14} strokeWidth={3} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mb-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Add Manager</label>
              <div className="flex gap-2">
                <select
                  className={`${inputClassName} cursor-pointer flex-1`}
                  value={pmChooserSelection}
                  onChange={(e) => setPmChooserSelection(e.target.value)}
                >
                  <option value="">Choose project manager...</option>
                  {projectManagers
                    .filter((pm) => !currentProjectManagers.includes(pm._id))
                    .map((pm) => (
                      <option key={pm._id} value={pm._id}>
                        {pm.fullName || pm.name}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  className="px-6 py-3 rounded-xl font-bold tracking-wide text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50 disabled:hover:bg-indigo-600"
                  disabled={!pmChooserSelection}
                  onClick={async () => {
                    if (pmChooserSelection) {
                      await handleAddPMToProject(pmChooserFor, pmChooserSelection);
                      setCurrentProjectManagers((prev) => [...prev, pmChooserSelection]);
                      setPmChooserSelection("");
                    }
                  }}
                >
                  Add
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
              <button type="button" className="px-6 py-3 rounded-xl font-bold tracking-wide text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors" onClick={closePMChooser}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
