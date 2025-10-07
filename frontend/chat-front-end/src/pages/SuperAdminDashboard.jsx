import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore.js";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";

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
    email: "",               // NEW
    contactNumber: "",
    location: "",
    description: "",
    startDate: "",
    endDate: "",
  });

  const [projectManagerForm, setProjectManagerForm] = useState({
    fullName: "",
    email: "",               // NEW
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
  const [createdCreds, setCreatedCreds] = useState(null);

  // Auth guard
  if (authUser?.role !== "superadmin") {
    return <p className="text-red-500">Unauthorized Access</p>;
  }

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
    if (!email.trim()) return toast.error("Client email is required");                 // NEW
    if (!contactNumber.trim()) return toast.error("Contact number is required");
    if (new Date(startDate) > new Date(endDate)) return toast.error("Start date cannot be after end date");

    setIsSubmitting(true);
    try {
      const { data } = await axiosInstance.post("/users/create-client-auto", {
        fullName: clientName.trim(),
        email: email.trim(),                                       // NEW
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
        emailSent: data?.emailSent === true,                       // NEW
      });

      setIsClientModalOpen(false);
      setClientForm({
        clientName: "",
        email: "",                                                 // NEW
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
    if (!email.trim()) return toast.error("Project Manager email is required");       // NEW
    if (!contactNumber.trim()) return toast.error("Contact number is required");

    setIsSubmitting(true);
    try {
      const { data } = await axiosInstance.post("/users/create-pm-auto", {
        fullName: fullName.trim(),
        email: email.trim(),                                     // NEW
        contactNumber: contactNumber.trim(),
      });
      toast.success(data?.message || "Project Manager created");

      const creds = data?.credentials || {};
      setCreatedCreds({
        email: creds.email,
        username: creds.username,
        password: creds.password,
        emailSent: data?.emailSent === true,                     // NEW
      });

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
      setProjectManagerForm({ fullName: "", email: "", contactNumber: "" });         // NEW
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
    } catch (err) {
      console.error("Error removing PM from project:", err);
      toast.error("Failed to remove Project Manager");
    }
  };

  const handleUpdateStatus = async (projectId, status) => {
    try {
      await axiosInstance.put(`/projects/${projectId}/update-status`, { status });
      toast.success("Status updated");
      await fetchProjects();
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("Failed to update status");
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

  const statusBadgeClass = (label) => {
    switch (label) {
      case "Ongoing":
        return "badge-info";
      case "Completed":
        return "badge-success";
      case "Finishing":
        return "badge-warning";
      case "Planning":
      case "Preparing":
      default:
        return "badge-ghost";
    }
  };

  const cycleStatus = async (proj) => {
    const order = ["planning", "in_progress", "completed"];
    const current = (proj.status || "planning").toLowerCase();
    const idx = order.indexOf(current);
    const next = order[(idx + 1) % order.length];
    await handleUpdateStatus(proj._id, next);
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

  // Render
  return (
    <div className="p-6 md:p-8">
      <h1 className="text-4xl font-bold mb-4">Super Admin Dashboard</h1>
      <p className="mb-6 text-lg">Manage clients, project managers, and projects here.</p>

      <div className="grid gap-4 sm:grid-cols-3">
        <button type="button" className="btn btn-primary h-20 flex items-center justify-center" onClick={openClientModal}>
          Create Client
        </button>

        <button type="button" className="btn btn-secondary h-20 flex items-center justify-center" onClick={openProjectManagerModal}>
          Create Project Manager
        </button>

        <button
          type="button"
          className="btn btn-accent h-20 flex items-center justify-center"
          onClick={() => {
            fetchClients();
            fetchProjectManagers();
            fetchProjects();
            openProjectModal();
          }}
        >
          Create Project
        </button>
      </div>

      {/* ---------- TABLE: Clients • Projects • PM • Status ---------- */}
      <div className="overflow-x-auto mt-8">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Client</th>
              <th>Project Description</th>
              <th>Project Manager(s)</th>
              <th>Status</th>
              <th>Start Date</th>
              <th>Target Deadline</th>
            </tr>
          </thead>
        <tbody>
          {safeProjects.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center text-sm opacity-70 py-6">
                No projects yet.
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
                <tr key={p._id}>
                  <td>{getClientName(p)}</td>
                  <td className="max-w-[420px] truncate">{p.description || "-"}</td>

                  <td>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        {assignedPMs.length === 0 ? (
                          <span className="badge">Unassigned</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {assignedPMs.map((pm) => (
                              <span key={pm._id} className="badge badge-outline">
                                {pm.fullName || pm.name}
                              </span>
                            ))}
                          </div>
                        )}
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          aria-label="Manage project managers"
                          title="Manage project managers"
                          onClick={() => openPMChooserFor(p._id)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span className={`badge ${statusBadgeClass(statusLabel)}`}>
                      {statusLabel}
                    </span>
                  </td>

                  <td>{p.startDate ? String(p.startDate).slice(0, 10) : "-"}</td>
                  <td>{p.targetDeadline ? String(p.targetDeadline).slice(0, 10) : "-"}</td>
                </tr>
              );
            })
          )}
        </tbody>
        </table>
      </div>

      {/* ---------- Client Creation Modal ---------- */}
      {isClientModalOpen && (
        <dialog open className="modal modal-open modal-bottom sm:modal-middle">
          <div className="modal-box w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Create Client</h3>
              <button onClick={closeClientModal} className="btn btn-sm btn-circle btn-ghost">✕</button>
            </div>

            <form className="space-y-4" onSubmit={handleCreateClient}>
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Client Name</span></label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="Enter client name"
                  value={clientForm.clientName}
                  onChange={(e) => setClientForm({ ...clientForm, clientName: e.target.value })}
                  required
                />
              </div>

              {/* NEW: Client Email */}
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Email</span></label>
                <input
                  type="email"
                  className="input input-bordered w-full"
                  placeholder="client@email.com"
                  value={clientForm.email}
                  onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Contact Number</span></label>
                <input
                  type="tel"
                  className="input input-bordered w-full"
                  placeholder="e.g. +63 917 894-3088"
                  value={clientForm.contactNumber}
                  onChange={(e) => setClientForm({ ...clientForm, contactNumber: e.target.value })}
                  required
                />
              </div>
              </div>

              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={closeClientModal} disabled={isSubmitting}>Cancel</button>
                <button type="submit" className={`btn btn-primary ${isSubmitting ? "loading" : ""}`} disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create"}
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-1">
                Username and a temporary password will be generated automatically (username ends with @eng.client).
              </p>
            </form>
          </div>

          <form method="dialog" className="modal-backdrop">
            <button onClick={closeClientModal}>close</button>
          </form>
        </dialog>
      )}

      {/* ---------- Project Manager Creation Modal ---------- */}
      {isProjectManagerModalOpen && (
        <dialog open className="modal modal-open modal-bottom sm:modal-middle">
          <div className="modal-box w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Create Project Manager</h3>
              <button onClick={closeProjectManagerModal} className="btn btn-sm btn-circle btn-ghost">✕</button>
            </div>

            <form className="space-y-4" onSubmit={handleCreateProjectManager}>
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Full Name</span></label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="Enter project manager full name"
                  value={projectManagerForm.fullName}
                  onChange={(e) => setProjectManagerForm({ ...projectManagerForm, fullName: e.target.value })}
                  required
                />
              </div>

              {/* NEW: PM Email */}
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Email</span></label>
                <input
                  type="email"
                  className="input input-bordered w-full"
                  placeholder="pm@email.com"
                  value={projectManagerForm.email}
                  onChange={(e) => setProjectManagerForm({ ...projectManagerForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Contact Number</span></label>
                <input
                  type="tel"
                  className="input input-bordered w-full"
                  placeholder="e.g. +63 917 894-3088"
                  value={projectManagerForm.contactNumber}
                  onChange={(e) => setProjectManagerForm({ ...projectManagerForm, contactNumber: e.target.value })}
                  required
                />
              </div>

              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={closeProjectManagerModal} disabled={isSubmitting}>Cancel</button>
                <button type="submit" className={`btn btn-secondary ${isSubmitting ? "loading" : ""}`} disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create"}
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-1">
                Username and a temporary password will be generated automatically (username ends with @eng.pmanager).
              </p>
            </form>
          </div>

          <form method="dialog" className="modal-backdrop">
            <button onClick={closeProjectManagerModal}>close</button>
          </form>
        </dialog>
      )}

      {/* ---------- Credentials Display Modal ---------- */}
      {createdCreds && (
        <dialog open className="modal modal-open modal-bottom sm:modal-middle">
          <div className="modal-box w-full max-w-md">
            <h3 className="font-bold text-lg mb-2">Account Created</h3>

            {/* NEW: Email status badge */}
            {"emailSent" in createdCreds ? (
              createdCreds.emailSent ? (
                <div className="badge badge-success mb-3">Email sent</div>
              ) : (
                <div className="badge mb-3">Email not sent</div>
              )
            ) : null}

            <p className="text-sm mb-4">Share these credentials with the user:</p>
            <div className="space-y-2">
              <div className="font-mono text-sm">Username: {createdCreds.username || createdCreds.email}</div>
              <div className="font-mono text-sm">Temporary Password: {createdCreds.password}</div>
            </div>
            <div className="modal-action">
              <button className="btn btn-primary" onClick={() => setCreatedCreds(null)}>Done</button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setCreatedCreds(null)}>close</button>
          </form>
        </dialog>
      )}

      {/* ---------- Create Project Modal ---------- */}
      {isProjectModalOpen && (
        <dialog open className="modal modal-open modal-bottom sm:modal-middle">
          <div className="modal-box w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Create Project</h3>
              <button onClick={closeProjectModal} className="btn btn-sm btn-circle btn-ghost">✕</button>
            </div>

            <form className="space-y-4" onSubmit={handleCreateProject}>
              {/* Client */}
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Client</span></label>
                <select
                  className="select select-bordered w-full"
                  name="clientId"
                  value={projectForm.clientId}
                  onChange={handleProjectFieldChange}
                  required
                  aria-label="Select client"
                >
                  <option value="" disabled>Select a client</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.fullName || c.name} {c.email ? `(${c.email})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project Manager with quick-add */}
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Project Manager</span></label>
                <div className="join w-full">
                  <select
                    className="select select-bordered join-item w-full"
                    name="projectManagerId"
                    value={projectForm.projectManagerId}
                    onChange={handleProjectFieldChange}
                    required
                    aria-label="Select project manager"
                  >
                    <option value="" disabled>Select a project manager</option>
                    {projectManagers.map((pm) => (
                      <option key={pm._id} value={pm._id}>
                        {pm.fullName || pm.name} {pm.contactNumber ? `(${pm.contactNumber})` : ""}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="btn btn-ghost join-item"
                    aria-label="Add new project manager"
                    title="Add new project manager"
                    onClick={() => setIsProjectManagerModalOpen(true)}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Contact */}
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Contact Number</span></label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  name="contactNumber"
                  placeholder="e.g. +63 917 894-3088"
                  value={projectForm.contactNumber}
                  onChange={handleProjectFieldChange}
                  required
                />
              </div>

              {/* Location */}
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Construction Location</span></label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  name="location"
                  placeholder="Enter construction location"
                  value={projectForm.location}
                  onChange={handleProjectFieldChange}
                  required
                />
              </div>

              {/* Description */}
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Construction Description / Details</span></label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  name="description"
                  placeholder="Describe the construction project"
                  rows="4"
                  value={projectForm.description}
                  onChange={handleProjectFieldChange}
                  required
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label"><span className="label-text font-medium">Start Date</span></label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    name="startDate"
                    value={projectForm.startDate}
                    onChange={handleProjectFieldChange}
                    required
                  />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-medium">Target Deadline</span></label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    name="targetDeadline"
                    value={projectForm.targetDeadline}
                    onChange={handleProjectFieldChange}
                    required
                  />
                </div>
              </div>

              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={closeProjectModal} disabled={isSubmitting}>Cancel</button>
                <button type="submit" className={`btn btn-primary ${isSubmitting ? "loading" : ""}`} disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>

          <form method="dialog" className="modal-backdrop">
            <button onClick={closeProjectModal}>close</button>
          </form>
        </dialog>
      )}

      {/* ---------- Manage Project Managers Modal ---------- */}
      {pmChooserFor && (
        <dialog open className="modal modal-open modal-bottom sm:modal-middle">
          <div className="modal-box w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Manage Project Managers</h3>
              <button onClick={closePMChooser} className="btn btn-sm btn-circle btn-ghost">✕</button>
            </div>

            {/* Current Project Managers */}
            <div className="mb-4">
              <h4 className="font-semibold mb-2">Currently Assigned:</h4>
              {currentProjectManagers.length === 0 ? (
                <p className="text-sm text-gray-500">No project managers assigned yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {currentProjectManagers.map((pmId) => {
                    const pm = projectManagers.find((p) => p._id === pmId);
                    return (
                      <div key={pmId} className="flex items-center gap-2 badge badge-outline p-3">
                        <span>{pm?.fullName || pm?.name || "Unknown PM"}</span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs text-red-500"
                          onClick={() => handleRemovePMFromProject(pmChooserFor, pmId)}
                          title="Remove project manager"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add New Project Manager */}
            <div className="form-control mb-4">
              <label className="label"><span className="label-text font-medium">Add Project Manager:</span></label>
              <div className="flex gap-2">
                <select
                  className="select select-bordered flex-1"
                  value={pmChooserSelection}
                  onChange={(e) => setPmChooserSelection(e.target.value)}
                  aria-label="Select project manager to add"
                >
                  <option value="">Choose project manager...</option>
                  {projectManagers
                    .filter((pm) => !currentProjectManagers.includes(pm._id))
                    .map((pm) => (
                      <option key={pm._id} value={pm._id}>
                        {pm.fullName || pm.name} {pm.contactNumber ? `(${pm.contactNumber})` : ""}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  className="btn btn-primary"
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

            <div className="modal-action">
              <button type="button" className="btn btn-primary" onClick={closePMChooser}>
                Done
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={closePMChooser}>close</button>
          </form>
        </dialog>
      )}

      {/* ---------- Credentials Display Modal (again for chooser context) ---------- */}
      {createdCreds && (
        <dialog open className="modal modal-open modal-bottom sm:modal-middle">
          <div className="modal-box w-full max-w-md">
            <h3 className="font-bold text-lg mb-2">Account Created</h3>

            {"emailSent" in createdCreds ? (
              createdCreds.emailSent ? (
                <div className="badge badge-success mb-3">Email sent</div>
              ) : (
                <div className="badge mb-3">Email not sent</div>
              )
            ) : null}

            <p className="text-sm mb-4">Share these credentials with the user:</p>
            <div className="space-y-2">
              <div className="font-mono text-sm">Username: {createdCreds.username || createdCreds.email}</div>
              <div className="font-mono text-sm">Temporary Password: {createdCreds.password}</div>
            </div>
            <div className="modal-action">
              <button className="btn btn-primary" onClick={() => setCreatedCreds(null)}>Done</button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setCreatedCreds(null)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
