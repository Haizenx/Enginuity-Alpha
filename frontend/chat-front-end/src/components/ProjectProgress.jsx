import React from "react";

const ProjectProgress = ({ progress = 0, completed = 0, total = 0 }) => {
  const pct = Number.isFinite(progress) ? Math.max(0, Math.min(100, Math.round(progress))) : 0;
  
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-sm border border-white p-8 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-shadow">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
        <h3 className="text-xl font-bold text-slate-800 tracking-tight">Project Progress</h3>
      </div>

      {/* Circular Progress - Main Focus */}
      <div className="flex flex-col items-center mb-8 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
        <div className="relative">
          <div 
            className="radial-progress text-indigo-600 text-5xl font-black mb-4 drop-shadow-md" 
            style={{ "--value": pct, "--size": "10rem", "--thickness": "12px" }} 
            role="progressbar" 
            aria-valuenow={pct} 
            aria-valuemin={0} 
            aria-valuemax={100}
          >
            {pct}%
          </div>
        </div>
        <p className="text-sm font-semibold text-slate-500 text-center bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
          <span className="text-indigo-600 font-bold">{completed}</span> of {total} activities completed
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
          <span>Completion</span>
          <span className="text-indigo-500">{pct}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/50">
          <div 
            className="bg-gradient-to-r from-indigo-500 to-sky-400 h-3 rounded-full shadow-sm transition-all duration-1000 ease-out" 
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProjectProgress;
