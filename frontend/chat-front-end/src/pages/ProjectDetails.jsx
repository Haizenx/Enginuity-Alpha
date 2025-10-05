// src/pages/ProjectDetails.jsx
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ProjectHeader from "../components/ProjectHeader";
import ActivitiesCard from "../components/ActivitiesCard";
import EmployeesCard from "../components/EmployeesCard";
import DocumentsCard from "../components/DocumentsCard";
import ProjectProgress from "../components/ProjectProgress";
import UpcomingDeadlines from "../components/UpcomingDeadlines";
import UploadDocumentModal from "../components/UploadDocumentModal";
import { axiosInstance } from "../lib/axios";
import { useProject } from "../services/useProject";
import { useActivities } from "../services/useActivities";
import { useDocuments } from "../services/useDocuments";

const ProjectDetails = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const { project, loading, fetchProject } = useProject(projectId);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
  const [coverFile, setCoverFile] = useState(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Optional quick preview modal state
  const [previewDoc, setPreviewDoc] = useState(null);

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
      <div className="min-h-screen bg-gray-50">
        <div className="skeleton h-64 w-full" />
        <div className="max-w-[1400px] mx-auto px-4 py-6">
          <div className="skeleton h-8 w-56 mb-4" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="skeleton h-24 w-full" />
              <div className="skeleton h-64 w-full" />
              <div className="skeleton h-64 w-full" />
            </div>
            <div className="lg:col-span-1 space-y-8">
              <div className="skeleton h-40 w-full" />
              <div className="skeleton h-64 w-full" />
              <div className="skeleton h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="alert alert-error max-w-md">
            <span>Project not found.</span>
          </div>
          <button className="btn btn-ghost mt-4" onClick={() => navigate(-1)}>
            Back
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
    <div className="min-h-screen bg-gray-50">
      <ProjectHeader
        name={displayName}
        location={project?.location}
        description={project?.description}
        imageUrl={project?.imageUrl}
        onBack={() => navigate(-1)}
        onOpenCoverUpload={() => setIsCoverModalOpen(true)}
      />

      {/* REVISED LAYOUT CONTAINER */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Content Grid: Switched to 3 columns for a cleaner 2/3 + 1/3 split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Area (2/3 width) */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-lg shadow-sm p-5">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Project Overview</h2>
              <p className="text-gray-600">{project?.description || "No description available."}</p>
            </div>
            
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
              onPreview={(doc) => setPreviewDoc(doc)}
            />
          </div>

          {/* Sidebar (1/3 width) */}
          <div className="lg:col-span-1 space-y-8">
            <ProjectProgress progress={progressPct} completed={completedActs} total={totalActs} />
            
            <UpcomingDeadlines
              activities={project?.activities || []}
              onToggle={toggleActivityMapped}
            />

            <EmployeesCard
              employees={project?.employees || []}
              onAdd={addEmployee}
              onRemove={removeEmployee}
            />
          </div>
        </div>
      </div>

      {/* Document Upload Modal */}
      <UploadDocumentModal
        open={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={uploadDocument}
        maxSizeMB={25}
      />

      {/* Cover Photo Modal */}
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

      {/* In-app Document Preview Modal */}
      {previewDoc && (
        <div className="modal modal-open">
          <div className="modal-box max-w-5xl w-11/12">
            <h3 className="font-bold text-lg mb-3">{previewDoc.name || "Preview"}</h3>
            <div className="h-[70vh]">
              <iframe
                title="Document preview"
                src={
                  /\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(previewDoc.name || previewDoc.url)
                    ? `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(previewDoc.url)}`
                    : previewDoc.url
                }
                className="w-full h-full rounded-md border"
              />
            </div>
            <div className="modal-action">
              <a
                href={`/api/projects/${projectId}/documents/${previewDoc._id || previewDoc.id}/view`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
              >
                Open in new tab
              </a>
              <button className="btn btn-ghost btn-sm" onClick={() => setPreviewDoc(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;