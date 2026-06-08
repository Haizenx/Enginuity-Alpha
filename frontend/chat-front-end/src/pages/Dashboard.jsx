import React, { useState, useEffect } from 'react';
import { axiosInstance } from '../lib/axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { LayoutDashboard, Calendar, Activity, Clock, CheckCircle2, AlertCircle, ArrowRight, FolderKanban } from 'lucide-react';

const MiniCalendar = () => {
  const now = new Date();
  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];
  const currentMonth = monthNames[now.getMonth()];
  const currentYear = now.getFullYear();

  const daysInMonth = new Date(currentYear, now.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, now.getMonth(), 1).getDay();

  const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const emptyCells = Array(firstDayOfMonth).fill(null);
  const dayCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const allCells = [...emptyCells, ...dayCells];

  return (
    <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-shadow">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-black text-xl text-slate-800 tracking-tight">
          {currentMonth} <span className="text-indigo-600">{currentYear}</span>
        </h3>
        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
           <Calendar size={20} />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center">
        {dayLabels.map(day => (
          <div key={day} className="font-bold text-xs text-slate-400 uppercase tracking-widest mb-2">{day}</div>
        ))}
        {allCells.map((day, index) => (
          <div
            key={index}
            className={`p-1 rounded-xl flex items-center justify-center h-10 w-10 text-sm font-bold transition-all duration-300
              ${day ? 'hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer' : ''}
              ${day && day === now.getDate() ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-110' : 'text-slate-600'}
            `}
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const { authUser } = useAuthStore();

  const [totalProjectsCount, setTotalProjectsCount] = useState(0);
  const [activeProjectsCount, setActiveProjectsCount] = useState(0);
  const [upcomingProjectsCount, setUpcomingProjectsCount] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState(null);

  const [deadlines, setDeadlines] = useState([]);
  const [activities, setActivities] = useState([]);
  const [ongoingProjects, setOngoingProjects] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoadingStats(true);
      setIsLoadingData(true);
      setStatsError(null);

      try {
        const response = await axiosInstance.get('/projects');
        const allProjects = response.data;

        if (!Array.isArray(allProjects)) {
          setStatsError("Unexpected data format for projects.");
          setIsLoadingStats(false);
          setIsLoadingData(false);
          return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let activeCount = 0;
        let upcomingCount = 0;
        const upcomingDeadlines = [];
        const recentActivities = [];
        const currentProjects = [];

        allProjects.forEach(project => {
          const startDate = project.startDate ? new Date(project.startDate) : null;
          const deadlineDate = project.targetDeadline ? new Date(project.targetDeadline) : null;
          if (startDate) startDate.setHours(0, 0, 0, 0);
          if (deadlineDate) deadlineDate.setHours(0, 0, 0, 0);

          const clientName =
            typeof project.client === 'object'
              ? (project.client.fullName || project.client.name || 'Client')
              : (project.clientName || 'Client');

          if (startDate && startDate <= today && project.status !== 'completed') {
            activeCount++;
            currentProjects.push({ ...project, _clientName: clientName });
          } else if (startDate && startDate > today) {
            upcomingCount++;
          }

          if (project.activities && Array.isArray(project.activities)) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            project.activities.forEach(activity => {
              if (activity.status !== 'completed' && activity.dueDate) {
                const activityDeadline = new Date(activity.dueDate);
                if (activityDeadline >= today) {
                  upcomingDeadlines.push({
                    date: activityDeadline,
                    task: activity.name,
                    projectName: clientName,
                    projectId: project._id
                  });
                }
              }
              if (activity.status === 'completed' && activity.completedAt) {
                const completedDate = new Date(activity.completedAt);
                if (completedDate >= thirtyDaysAgo) {
                  recentActivities.push({
                    date: completedDate,
                    task: activity.name,
                    projectName: clientName,
                    projectId: project._id
                  });
                }
              }
            });
          }
        });

        upcomingDeadlines.sort((a, b) => a.date - b.date);
        recentActivities.sort((a, b) => b.date - a.date);

        setActiveProjectsCount(activeCount);
        setUpcomingProjectsCount(upcomingCount);
        setDeadlines(upcomingDeadlines.slice(0, 7));
        setActivities(recentActivities.slice(0, 7));
        setOngoingProjects(currentProjects);
        setTotalProjectsCount(allProjects.length);
      } catch (err) {
        const errorMessage = err.response?.data?.message || "Failed to load project data.";
        setStatsError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoadingStats(false);
        setIsLoadingData(false);
      }
    };

    fetchAllData();
  }, [authUser?._id, authUser?.role]);

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-';

  const stats = [
    { title: 'Active Projects', value: activeProjectsCount, buttonText: 'See Projects', path: '/projects?status=active', color: 'indigo', icon: FolderKanban },
    { title: 'Upcoming Projects', value: upcomingProjectsCount, color: 'emerald', icon: Calendar },
    { title: 'Total Projects', value: totalProjectsCount, buttonText: 'See All Projects', path: '/projects', color: 'sky', icon: CheckCircle2 },
  ];

  return (
    <main className="min-h-screen w-full bg-slate-50/50 relative py-12 px-4 sm:px-6 lg:px-8 pb-32">
      {/* Ambient Background Blobs */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-200/40 rounded-full blur-[120px] mix-blend-multiply pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-sky-200/40 rounded-full blur-[120px] mix-blend-multiply pointer-events-none" />

      <div className="max-w-[1400px] mx-auto relative z-10">
        
        {/* Header Section */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
           <div>
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                    <LayoutDashboard size={24} />
                 </div>
                 <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight">Dashboard</h1>
              </div>
              <p className="text-lg text-slate-500 max-w-2xl font-medium leading-relaxed">
                Welcome back! Here's an overview of your projects, recent activities, and upcoming deadlines.
              </p>
           </div>
           <div className="bg-white/80 backdrop-blur-xl px-6 py-3 rounded-full border border-white shadow-sm flex items-center gap-3">
               <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
               </span>
               <span className="font-bold text-slate-600 text-sm tracking-wide">System Online</span>
           </div>
        </div>

        {/* Stats Cards */}
        {isLoadingStats ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {Array(3).fill(0).map((_, index) => (
              <div key={index} className="bg-white/60 backdrop-blur-xl p-8 rounded-[2rem] border border-white shadow-sm h-48 animate-pulse flex flex-col justify-between">
                <div className="h-6 bg-slate-200 rounded w-1/2"></div>
                <div className="h-12 bg-slate-200 rounded w-1/3"></div>
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        ) : statsError ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-3xl shadow-sm flex items-center gap-3 mb-12">
            <AlertCircle className="w-6 h-6 text-rose-500" />
            <span className="font-semibold">{statsError}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {stats.map((stat) => (
              <div key={stat.title} className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 group flex flex-col justify-between relative overflow-hidden">
                <div className={`absolute -right-6 -top-6 w-32 h-32 bg-${stat.color}-500/10 rounded-full blur-2xl group-hover:bg-${stat.color}-500/20 transition-colors`}></div>
                <div>
                    <div className="flex justify-between items-start mb-4">
                       <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">{stat.title}</h2>
                       <div className={`w-10 h-10 rounded-xl bg-${stat.color}-50 text-${stat.color}-500 flex items-center justify-center`}>
                          <stat.icon size={20} />
                       </div>
                    </div>
                    <p className={`text-6xl font-black text-${stat.color}-600 tracking-tighter mb-4`}>{stat.value}</p>
                </div>
                {stat.buttonText && (
                  <Link to={stat.path || '#'} className={`inline-flex items-center gap-2 text-sm font-bold text-${stat.color}-600 hover:text-${stat.color}-700 transition-colors mt-auto w-max`}>
                    {stat.buttonText} <ArrowRight size={16} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Deadlines Card */}
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-shadow">
              <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
                 <div className="w-2 h-8 bg-rose-400 rounded-full"></div>
                 <h2 className="text-2xl font-black text-slate-800 tracking-tight">Upcoming Deadlines</h2>
              </div>
              
              {isLoadingData ? (
                <div className="flex justify-center py-12">
                   <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500"></div>
                </div>
              ) : deadlines.length > 0 ? (
                <ul className="space-y-4">
                  {deadlines.map((deadline, index) => (
                    <li key={index}>
                      <Link to={`/projects/${deadline.projectId}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-rose-200 hover:bg-white transition-all group shadow-sm">
                        <div className="mb-2 sm:mb-0">
                          <p className="text-lg font-bold text-slate-800 group-hover:text-rose-600 transition-colors">{deadline.task}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                             <FolderKanban size={12} />
                             <span>{deadline.projectName}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-rose-50 text-rose-600 px-4 py-2 rounded-xl font-bold text-sm border border-rose-100">
                           <Clock size={14} />
                           <span>{formatDate(deadline.date)}</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-12 bg-slate-50 border border-slate-100 rounded-2xl border-dashed">
                   <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100">
                      <CheckCircle2 className="w-6 h-6 text-slate-300" />
                   </div>
                   <p className="text-slate-500 font-medium">No upcoming deadlines.</p>
                </div>
              )}
            </div>

            {/* Activities Card */}
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-shadow">
              <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
                 <div className="w-2 h-8 bg-sky-400 rounded-full"></div>
                 <h2 className="text-2xl font-black text-slate-800 tracking-tight">Recent Activities</h2>
              </div>
              
              {isLoadingData ? (
                <div className="flex justify-center py-12">
                   <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500"></div>
                </div>
              ) : activities.length > 0 ? (
                <ul className="space-y-4">
                  {activities.map((activity, index) => (
                    <li key={index}>
                      <Link to={`/projects/${activity.projectId}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-sky-200 hover:bg-white transition-all group shadow-sm">
                        <div className="mb-2 sm:mb-0">
                          <p className="text-lg font-bold text-slate-800 group-hover:text-sky-600 transition-colors">{activity.task}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                             <FolderKanban size={12} />
                             <span>{activity.projectName}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-100 text-slate-500 px-4 py-2 rounded-xl font-bold text-sm">
                           <span>{formatDate(activity.date)}</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-12 bg-slate-50 border border-slate-100 rounded-2xl border-dashed">
                   <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100">
                      <Activity className="w-6 h-6 text-slate-300" />
                   </div>
                   <p className="text-slate-500 font-medium">No recent activities.</p>
                </div>
              )}
            </div>
            
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <MiniCalendar />
            
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-shadow">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                 <div className="w-2 h-6 bg-emerald-400 rounded-full"></div>
                 <h2 className="text-xl font-black text-slate-800 tracking-tight">Ongoing Projects</h2>
              </div>
              
              {isLoadingData ? (
                <div className="flex justify-center py-8">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                </div>
              ) : ongoingProjects.length > 0 ? (
                <ul className="space-y-4">
                  {ongoingProjects.map((project) => (
                    <li key={project._id}>
                      <Link to={`/projects/${project._id}`} className="block p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:bg-emerald-50/50 transition-all group shadow-sm">
                        <div className="font-bold text-slate-800 mb-1 group-hover:text-emerald-700 transition-colors">
                          {project._clientName || 'Client'}
                        </div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 line-clamp-1">
                          {project.location || 'No Location specified'}
                        </div>
                        <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100">
                           <span className="text-xs font-bold text-slate-400">Deadline</span>
                           <span className="text-sm font-bold text-slate-700">{formatDate(project.targetDeadline)}</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8 bg-slate-50 border border-slate-100 rounded-2xl border-dashed">
                   <p className="text-slate-500 font-medium text-sm">No ongoing projects.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default DashboardPage;
