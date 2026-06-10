import React from "react";
import { FileText, Trash2, Eye, File, Upload, Download, Image } from "lucide-react";
import toast from "react-hot-toast";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "";

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

  const confirmToast = async (message) => {
    return window.confirm(message);
  };

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
    <div className="card bg-base-100 shadow-md h-full flex flex-col">
      <div className="card-body flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Project Documents</h3>
            <p className="text-sm text-slate-500 mt-1">Manage files, blueprints, and site documents</p>
          </div>
          <button
            onClick={onOpenUpload}
            className="btn btn-primary gap-2 shadow-sm shadow-indigo-200"
            title="Upload Document"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Upload New</span>
          </button>
        </div>

        {/* Upload Zone / Document Grid */}
        <div className="mb-10">
          {documents.length === 0 ? (
            <div 
              onClick={onOpenUpload}
              className="w-full p-12 border-2 border-dashed border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 cursor-pointer rounded-2xl transition-all flex flex-col items-center justify-center group"
            >
              <div className="w-16 h-16 bg-indigo-100 text-indigo-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Upload className="h-8 w-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-700 mb-1">Upload Project Documents</h4>
              <p className="text-sm text-slate-500 text-center max-w-sm">Drag and drop your engineering plans, blueprints, or site photos here, or click to browse files.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {documents.map((doc) => {
                const id = doc._id || doc.id;
                const displayName = doc.originalName || doc.filename || doc.name || "Untitled";
                const downloadHref = `${API_BASE}/api/projects/${projectId}/documents/${id}/download`;

                return (
                  <div
                    key={id}
                    className="flex items-start gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
                      {getFileIcon(displayName)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-800 truncate" title={displayName}>
                        {displayName}
                      </h4>
                      <div className="text-xs font-medium text-slate-500 mt-1 space-y-0.5">
                        {doc.size ? <div>{formatFileSize(doc.size)}</div> : null}
                        {doc.uploadedAt ? <div>{formatDate(doc.uploadedAt)}</div> : null}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={downloadHref} className="btn btn-ghost btn-xs w-8 h-8 p-0 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                        <Download className="h-4 w-4" />
                      </a>
                      <button onClick={() => handleDelete(doc)} className="btn btn-ghost btn-xs w-8 h-8 p-0 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Visual Gallery Placeholder (Utilizes bottom whitespace) */}
        <div className="mt-auto border-t border-slate-100 pt-8">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Blueprints & Site Photos</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-video bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden relative group cursor-pointer flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-tr from-slate-200/50 to-slate-100/50 group-hover:scale-105 transition-transform" />
                <Image className="w-8 h-8 text-slate-300 relative z-10" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                  <span className="text-white font-medium text-sm drop-shadow-sm">View Image</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DocumentsCard;
