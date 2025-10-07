import React from "react";
import { FileText, Trash2, Eye, File, Upload, Download } from "lucide-react";
import toast from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const DocumentsCard = ({ projectId, documents = [], onOpenUpload, onDelete }) => {
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const getFileIcon = (filename) => {
    if (!filename) return <File className="h-5 w-5 text-base-content/40" />;
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "pdf":
        return <FileText className="h-5 w-5 text-red-500" />;
      case "doc":
      case "docx":
        return <FileText className="h-5 w-5 text-blue-500" />;
      case "xls":
      case "xlsx":
        return <FileText className="h-5 w-5 text-green-500" />;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <FileText className="h-5 w-5 text-purple-500" />;
      default:
        return <File className="h-5 w-5 text-base-content/40" />;
    }
  };

  const confirmToast = (message, confirmLabel = "Delete", cancelLabel = "Cancel") =>
    new Promise((resolve) => {
      const id = toast.custom(
        (t) => (
          <div className="bg-base-100 text-base-content shadow-lg rounded-md p-4 border w-[320px]">
            <p className="text-sm">{message}</p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => {
                  toast.dismiss(id);
                  resolve(false);
                }}
              >
                {cancelLabel}
              </button>
              <button
                className="btn btn-error btn-xs"
                onClick={() => {
                  toast.dismiss(id);
                  resolve(true);
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        ),
        { duration: 8000, id: Math.random().toString(36).slice(2) }
      );
    });

  const handleDelete = async (doc) => {
    const title = doc?.originalName || doc?.filename || doc?.name || "this document";
    const ok = await confirmToast(`Delete "${title}" permanently?`);
    if (!ok) return;

    const loadingId = toast.loading("Deleting...");
    try {
      await onDelete(doc._id || doc.id);
      toast.dismiss(loadingId);
      toast.success(`"${title}" deleted`);
    } catch (e) {
      toast.dismiss(loadingId);
      const data = e?.response?.data;
      toast.error(data?.message || data?.error || "Failed to delete document");
    }
  };

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-base-content">Project Documents</h3>
          <button
            onClick={onOpenUpload}
            className="btn btn-secondary btn-xs gap-1 px-2"
            title="Upload"
          >
            <Upload className="h-3 w-3" />
            <span className="hidden sm:inline">Upload</span>
          </button>
        </div>

        <div className="space-y-3">
          {documents.length === 0 ? (
            <div className="text-center py-8 text-base-content/60">
              <FileText className="mx-auto h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm mb-2">No documents uploaded yet.</p>
              <button
                onClick={onOpenUpload}
                className="mt-4 w-full p-4 border-2 border-dashed border-base-content/20 rounded-lg hover:border-base-content/40 transition-colors"
              >
                <Upload className="mx-auto h-6 w-6 text-base-content/40 mb-2" />
                <p className="text-sm text-base-content/60">Click to upload</p>
                <p className="text-xs text-base-content/50 mt-1">Drag and drop files here</p>
              </button>
            </div>
          ) : (
            documents.map((doc) => {
              const id = doc._id || doc.id;
              const displayName = doc.originalName || doc.filename || doc.name || "Untitled";
              const viewHref = `${API_BASE}/api/projects/${projectId}/documents/${id}/view`;
              const downloadHref = `${API_BASE}/api/projects/${projectId}/documents/${id}/download`;

              return (
                <div
                  key={id}
                  className="flex items-start gap-3 p-3 border border-base-content/20 rounded-lg hover:bg-base-200/50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5">{getFileIcon(displayName)}</div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-base-content truncate">
                      {displayName}
                    </h4>
                    <div className="text-xs text-base-content/60 mt-1 space-y-0.5">
                      {doc.size ? <div>{formatFileSize(doc.size)}</div> : null}
                      {doc.uploadedAt ? <div>{formatDate(doc.uploadedAt)}</div> : null}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-1">
                    <a
                      href={downloadHref}
                      className="btn btn-ghost btn-xs"
                      title="Download"
                    >
                      <Download className="h-3 w-3" />
                    </a>
                    <a
                      href={viewHref}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-ghost btn-xs"
                      title="View"
                    >
                      <Eye className="h-3 w-3" />
                    </a>
                    <button
                      onClick={() => handleDelete(doc)}
                      className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentsCard;
