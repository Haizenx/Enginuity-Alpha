import React, { useState, useEffect } from 'react';
import { axiosInstance } from '../lib/axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';

const ProjectPage = () => {
  const [currentProjects, setCurrentProjects] = useState([]);
  const [finishedProjects, setFinishedProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get('/projects');
      const allProjects = response.data;

      if (Array.isArray(allProjects)) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const ongoing = [];
        const finished = [];

        allProjects.forEach(project => {
          const deadlineDate = project.targetDeadline ? new Date(project.targetDeadline) : null;
          if (deadlineDate) deadlineDate.setHours(0, 0, 0, 0);

          if (deadlineDate && deadlineDate < today) {
            finished.push(project);
          } else {
            ongoing.push(project);
          }
        });

        setCurrentProjects(ongoing);
        setFinishedProjects(finished);
      } else {
        setError("Unexpected data format for projects.");
        toast.error("Failed to load projects.");
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to load projects.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDeleteProject = async (projectId, event) => {
    event.stopPropagation();
    event.preventDefault();

    if (window.confirm("Are you sure you want to permanently delete this project?")) {
      try {
        await axiosInstance.delete(`/projects/${projectId}`);
        toast.success("Project deleted successfully!");
        fetchProjects();
      } catch (error) {
        const errorMessage = error.response?.data?.message || "Failed to delete project.";
        toast.error(errorMessage);
      }
    }
  };

  const renderProjectList = (projectsToRender, title) => {
    if (projectsToRender.length === 0) {
      return (
        <div className="text-center p-12 bg-white/40 backdrop-blur-sm rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-slate-400 font-medium text-lg">No {title.toLowerCase()} found.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {projectsToRender.map((project) => {
          const coverUrl = project.imageUrl || 'https://placehold.co/600x400/f8fafc/94a3b8?text=No+Image';
          const startDate = project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A';
          const deadline = project.targetDeadline ? new Date(project.targetDeadline).toLocaleDateString() : 'N/A';
          const clientDisplay =
            typeof project.client === 'object'
              ? (project.client.fullName || project.client.name || 'Client')
              : (project.clientName || 'Client');

          return (
            <Link
              to={`/projects/${project._id}`}
              key={project._id}
              className="group relative block h-[320px] rounded-[2rem] overflow-hidden shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-500"
            >
              {/* Background Image with Zoom Effect */}
              <div
                className="absolute inset-0 w-full h-full bg-slate-100 group-hover:scale-105 transition-transform duration-700 ease-out"
                style={{
                  backgroundImage: `url(${coverUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              {/* Soft Gradient Overlay instead of harsh black */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80" />
              
              {/* Floating Delete Button */}
              <button
                onClick={(e) => handleDeleteProject(project._id, e)}
                className="absolute top-4 right-4 z-20 p-2.5 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-rose-500 hover:text-white hover:scale-110 hover:shadow-lg transition-all duration-300 border border-white/20"
                aria-label="Delete Project"
                title="Delete Project"
              >
                <Trash2 size={18} />
              </button>

              {/* Glassmorphic Info Card */}
              <div className="absolute bottom-4 left-4 right-4 z-10 p-5 rounded-3xl bg-white/20 backdrop-blur-xl border border-white/30 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                <h3 className="text-white text-xl font-black drop-shadow-sm mb-1 truncate">
                  {clientDisplay}
                </h3>
                <p className="text-white/90 text-sm font-semibold drop-shadow-sm mb-3 truncate flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  {project.location || 'No location set'}
                </p>
                <div className="flex justify-between items-center text-[11px] font-bold tracking-wider text-white/80 uppercase">
                  <span className="bg-black/20 px-3 py-1.5 rounded-full border border-white/10">Start: {startDate}</span>
                  <span className="bg-black/20 px-3 py-1.5 rounded-full border border-white/10">Due: {deadline}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <main className="min-h-screen w-full bg-slate-50/50 relative py-12 px-4 sm:px-6 lg:px-8">
      {/* Ambient Background Blobs */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-200/40 rounded-full blur-[120px] mix-blend-multiply pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-sky-200/40 rounded-full blur-[120px] mix-blend-multiply pointer-events-none" />

      <div className="max-w-[1400px] mx-auto relative z-10">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight mb-4">Projects Portfolio</h1>
          <p className="text-lg text-slate-500 max-w-2xl font-medium leading-relaxed">
            Review and manage construction projects assigned to this account. Creation is handled by the Super Admin.
          </p>
        </div>

        {isLoading && (
          <div className="flex flex-col justify-center items-center p-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-slate-500 font-medium">Loading portfolio...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-2xl shadow-sm mb-8 flex items-center gap-3">
            <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span className="font-semibold">Error! {error}</span>
          </div>
        )}

        {!isLoading && !error && (
          <div className="space-y-16">
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-8 bg-indigo-500 rounded-full"></div>
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Ongoing & Upcoming</h2>
              </div>
              {renderProjectList(currentProjects, "Ongoing & Upcoming Projects")}
            </section>

            {finishedProjects.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-2 h-8 bg-slate-300 rounded-full"></div>
                  <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Finished Projects</h2>
                </div>
                {renderProjectList(finishedProjects, "Finished Projects")}
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

export default ProjectPage;
