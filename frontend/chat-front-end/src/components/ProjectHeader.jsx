import React from "react";
import { ChevronLeft, Camera } from "lucide-react";

const ProjectHeader = ({
  name,
  location,
  
  imageUrl,
  onBack,
  onOpenCoverUpload,
  status,
  onStatusChange
}) => {
  return (
    <div className="w-full relative z-20">
      <div className="relative w-full h-[400px] overflow-hidden bg-slate-100">
        {imageUrl ? (
          <img src={imageUrl} alt="Project cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-sky-100" />
        )}

        {/* Premium gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />

        {/* Floating back button (top-left) */}
        {onBack && (
          <button
            type="button"
            aria-label="Go back"
            onClick={onBack}
            className="absolute top-6 left-6 w-12 h-12 bg-white/20 hover:bg-white backdrop-blur-md hover:text-slate-800 rounded-full flex items-center justify-center text-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 border border-white/30"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Top-right actions */}
        <div className="absolute top-6 right-6 flex items-center gap-3">
          {onStatusChange && (
            <div className="relative group">
              <select
                value={status || "pending"}
                onChange={(e) => onStatusChange(e.target.value)}
                className="appearance-none outline-none pl-5 pr-10 py-2.5 bg-white/20 hover:bg-white backdrop-blur-md rounded-full text-white hover:text-slate-800 shadow-sm hover:shadow-lg transition-all duration-300 border border-white/30 font-semibold text-sm tracking-wide cursor-pointer text-center"
              >
                <option value="pending" className="text-slate-800">Preparing</option>
                <option value="in-progress" className="text-slate-800">Building</option>
                <option value="completed" className="text-slate-800">Finished</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white group-hover:text-slate-800 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          )}
          {onOpenCoverUpload && (
            <button 
              className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white backdrop-blur-md rounded-full text-white hover:text-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 border border-white/30 font-semibold text-sm tracking-wide" 
              onClick={onOpenCoverUpload}
            >
              <Camera className="w-4 h-4" />
              Update Cover
            </button>
          )}
        </div>

        {/* Project title and location */}
        <div className="absolute left-10 right-10 bottom-10 z-10">
          <h1 className="text-5xl md:text-6xl font-black text-white drop-shadow-md mb-3 tracking-tight">
            {name || "Project"}
          </h1>
          {location && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-black/30 backdrop-blur-md rounded-full border border-white/10">
              <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              <p className="text-white font-medium drop-shadow-sm">
                {location}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectHeader;
