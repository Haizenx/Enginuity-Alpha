import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ProjectHeader from "../components/ProjectHeader";
import ActivitiesCard from "../components/ActivitiesCard";
import DocumentsCard from "../components/DocumentsCard";
import ProjectProgress from "../components/ProjectProgress";
import UpcomingDeadlines from "../components/UpcomingDeadlines";
import UploadDocumentModal from "../components/UploadDocumentModal";
import { axiosInstance } from "../lib/axios";
import { useProject } from "../services/useProject";
import { useActivities } from "../services/useActivities";
import { useDocuments } from "../services/useDocuments";
import { useAuthStore } from "../store/useAuthStore";

const ProjectDetails = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { authUser } = useAuthStore();
  const canEdit = authUser?.role === "superadmin" || authUser?.role === "project_manager";

  const handleStatusChange = async (newStatus) => {
    try {
      await axiosInstance.put(`/projects/${projectId}/update-status`, { status: newStatus });
      toast.success("Project status updated successfully");
      fetchProject(); // refresh data
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status");
    }
  };


  const { project, loading, fetchProject } = useProject(projectId);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
  const [coverFile, setCoverFile] = useState(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleStartDate, setScheduleStartDate] = useState("");
  const [scheduleEndDate, setScheduleEndDate] = useState("");

  const handleUpdateSchedule = async () => {
    try {
      await axiosInstance.put(`/projects/${projectId}/dates`, {
        startDate: scheduleStartDate,
        targetDeadline: scheduleEndDate
      });
      import("react-hot-toast").then((module) => module.default.success("Project schedule updated successfully"));
      setIsScheduleModalOpen(false);
      fetchProject();
    } catch (err) {
      import("react-hot-toast").then((module) => module.default.error(err.response?.data?.message || "Failed to update schedule"));
    }
  };

  const openScheduleModal = () => {
    if (project?.startDate) setScheduleStartDate(project.startDate.split('T')[0]);
    if (project?.targetDeadline) setScheduleEndDate(project.targetDeadline.split('T')[0]);
    setIsScheduleModalOpen(true);
  };

  const { addActivity, toggleActivity, deleteActivity } = useActivities(projectId, fetchProject);
  const { uploadDocument, deleteDocument } = useDocuments(projectId, fetchProject);

  const addActivityMapped = (payload) => {
    const { name, startDate, endDate, status = "pending", description } = payload || {};
    return addActivity({ name, description, startDate, dueDate: endDate, status });
  };

  const toggleActivityMapped = (id, u) => {
    const isCompleted = u?.status === "completed";
    return toggleActivity(id, {
      status: isCompleted ? "completed" : "pending",
      completedAt: isCompleted ? new Date().toISOString() : null,
    });
  };

  const addEmployee = async (payload) => {
    const { name, role, wagePerDay, startDate, endDate } = payload || {};
    try {
      await axiosInstance.post(`/projects/${projectId}/employees`, {
        name,
        role,
        wagePerDay,
        startDate,
        dueDate: endDate,
      });
      await fetchProject();
      toast.success("Employee added!");
    } catch (err) {
      const data = err?.response?.data;
      console.error("Error adding employee:", data || err);
      toast.error(data?.message || "Failed to add employee");
    }
  };

  const removeEmployee = async (employeeId) => {
    if (!window.confirm("Remove this employee?")) return;
    try {
      await axiosInstance.delete(`/projects/${projectId}/employees/${employeeId}`);
      await fetchProject();
      toast.success("Employee removed!");
    } catch (err) {
      const data = err?.response?.data;
      console.error("Error removing employee:", data || err);
      toast.error(data?.message || "Failed to remove employee");
    }
  };

  const uploadCover = async () => {
    if (!coverFile) {
      toast.error("Please select a cover image.");
      return;
    }
    const formData = new FormData();
    formData.append("file", coverFile);
    setUploadingCover(true);
    try {
      await axiosInstance.post(`/projects/${projectId}/cover-photo`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Cover photo updated!");
      setIsCoverModalOpen(false);
      setCoverFile(null);
      await fetchProject();
    } catch (err) {
      const data = err?.response?.data;
      console.error("Error uploading cover:", data || err);
      toast.error(data?.message || data?.error || "Failed to upload cover");
    } finally {
      setUploadingCover(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 relative">
        {/* Ambient Blobs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-200/40 rounded-full blur-[120px] mix-blend-multiply pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-sky-200/40 rounded-full blur-[120px] mix-blend-multiply pointer-events-none" />
        
        <div className="relative z-10">
          <div className="h-72 w-full bg-slate-200/50 animate-pulse" />
          <div className="max-w-[1400px] mx-auto px-4 py-12">
            <div className="h-10 w-64 bg-slate-200/50 rounded-xl mb-8 animate-pulse" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="h-32 w-full bg-white/60 backdrop-blur-sm rounded-3xl animate-pulse" />
                <div className="h-80 w-full bg-white/60 backdrop-blur-sm rounded-3xl animate-pulse" />
                <div className="h-80 w-full bg-white/60 backdrop-blur-sm rounded-3xl animate-pulse" />
              </div>
              <div className="lg:col-span-1 space-y-8">
                <div className="h-48 w-full bg-white/60 backdrop-blur-sm rounded-3xl animate-pulse" />
                <div className="h-80 w-full bg-white/60 backdrop-blur-sm rounded-3xl animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center max-w-md">
          <svg className="w-16 h-16 text-rose-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Project not found</h2>
          <p className="text-slate-500 mb-6">The project you are looking for does not exist or has been deleted.</p>
          <button className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors" onClick={() => navigate(-1)}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const displayName =
    project?.client?.fullName ||
    project?.client?.name ||
    project?.clientName ||
    project?.name ||
    "Project";

  const totalActs = Array.isArray(project?.activities) ? project.activities.length : 0;
  const completedActs = totalActs
    ? project.activities.filter((a) => a.status === "completed").length
    : 0;
  const derivedPct = totalActs ? Math.round((completedActs / totalActs) * 100) : 0;
  const progressPct =
    Number.isFinite(project?.progress) && project?.progress >= 0
      ? project.progress
      : derivedPct;

  return (
    <div className="min-h-screen bg-slate-50/50 relative pb-20">
      {/* Ambient Blobs */}
      <div className="absolute top-80 left-0 w-[600px] h-[600px] bg-indigo-200/30 rounded-full blur-[120px] mix-blend-multiply pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-sky-200/30 rounded-full blur-[120px] mix-blend-multiply pointer-events-none" />

      <div className="relative z-10">
        <ProjectHeader
          status={project?.status}
          onStatusChange={canEdit ? handleStatusChange : undefined}
          name={displayName}
          location={project?.location}
          description={project?.description}
          imageUrl={project?.imageUrl}
          onBack={() => navigate(-1)}
          onOpenCoverUpload={() => setIsCoverModalOpen(true)}
        />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col space-y-8">
            
            {/* Project Overview & Schedule */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-sm border border-white p-8 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-shadow">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-3">Project Overview</h2>
                <p className="text-slate-600 leading-relaxed font-medium">{project?.description || "No description available."}</p>
              </div>

              <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-sm border border-white p-8 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-shadow flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Schedule</h2>
                    {canEdit && (
                      <button onClick={openScheduleModal} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Start Date</p>
                      <p className="font-semibold text-slate-800">{project?.startDate ? new Date(project.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Target Deadline</p>
                      <p className="font-semibold text-slate-800">{project?.targetDeadline ? new Date(project.targetDeadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not set'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Analytics & Deadlines */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <ProjectProgress progress={progressPct} completed={completedActs} total={totalActs} />
              <UpcomingDeadlines
                activities={project?.activities || []}
                onToggle={toggleActivityMapped}
              />
            </div>

            {/* Activities & Documents */}
            <ActivitiesCard
              activities={project?.activities || []}
              onAdd={addActivityMapped}
              onDelete={deleteActivity}
            />

            <DocumentsCard
              projectId={projectId}
              documents={project?.documents || []}
              onOpenUpload={() => setIsUploadModalOpen(true)}
              onDelete={deleteDocument}
            />

          </div>
        </div>
      </div>

      <UploadDocumentModal
        open={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={uploadDocument}
        maxSizeMB={25}
      />

      {isCoverModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Change Cover Photo</h3>
            <div className="py-4">
              <input
                type="file"
                accept="image/*"
                className="file-input file-input-bordered w-full"
                onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setIsCoverModalOpen(false);
                  setCoverFile(null);
                }}
                disabled={uploadingCover}
              >
                Cancel
              </button>
              <button
                className={`btn btn-secondary ${uploadingCover ? "btn-disabled" : ""}`}
                onClick={uploadCover}
              >
                {uploadingCover ? "Uploading..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
      {isScheduleModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Edit Project Schedule</h3>
            <div className="space-y-4">
              <div>
                <label className="label"><span className="label-text">Start Date</span></label>
                <input
                  type="date"
                  value={scheduleStartDate}
                  onChange={(e) => setScheduleStartDate(e.target.value)}
                  className="input input-bordered w-full"
                />
              </div>
              <div>
                <label className="label"><span className="label-text">Target Deadline</span></label>
                <input
                  type="date"
                  value={scheduleEndDate}
                  onChange={(e) => setScheduleEndDate(e.target.value)}
                  className="input input-bordered w-full"
                />
              </div>
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setIsScheduleModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdateSchedule}>Save</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setIsScheduleModalOpen(false)}></div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;
