import React from "react";
import toast, { Toaster } from "react-hot-toast"; // use react-hot-toast here

const UpcomingDeadlines = ({ activities = [], onToggle }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return dateString;
    }
  };

  // Promise-based confirmation using react-hot-toast
  const confirmToast = (message, confirmLabel = "Confirm", cancelLabel = "Cancel") =>
    new Promise((resolve) => {
      const id = toast.custom(
        () => (
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
                className="btn btn-secondary btn-xs"
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
        { duration: 8000, id: Math.random().toString(36).slice(2) } // allow time to read
      );
    });

  const handleToggleActivity = async (activity) => {
    const isCompleted = activity.status === "completed";
    const activityName = activity.name || "this activity";

    const ok = await confirmToast(
      isCompleted
        ? `Mark "${activityName}" as pending?`
        : `Mark "${activityName}" as accomplished?`,
      isCompleted ? "Mark Pending" : "Mark Done"
    );

    if (!ok) return;

    const updates = isCompleted
      ? { status: "pending", completedAt: null }
      : { status: "completed", completedAt: new Date().toISOString() };

    await onToggle(activity._id || activity.id, updates);

    toast.success(
      isCompleted
        ? `"${activityName}" marked as pending.`
        : `🎉 "${activityName}" marked as completed!`
    );
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-sm border border-white p-8 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-shadow">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-rose-400 rounded-full"></div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">Upcoming Deadlines</h3>
        </div>
      </div>

      <div className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-3xl border border-slate-100">
            <p className="font-medium">No upcoming deadlines.</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity._id || activity.id}
              className={`flex items-start gap-4 p-4 rounded-2xl transition-all duration-300 border border-slate-100/50 shadow-sm hover:shadow-md ${
                activity.status === "completed" ? "bg-slate-50 opacity-75" : "bg-white hover:-translate-y-0.5"
              }`}
            >
              <input
                type="checkbox"
                className="w-5 h-5 mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 transition-colors cursor-pointer"
                checked={activity.status === "completed"}
                onChange={() => handleToggleActivity(activity)}
              />
              <div className="flex-1 min-w-0">
                <h4
                  className={`font-bold text-base tracking-tight ${
                    activity.status === "completed" ? "line-through text-slate-400" : "text-slate-800"
                  }`}
                >
                  {activity.name || "Untitled"}
                </h4>
                {activity.description && (
                  <p className="text-sm font-medium text-slate-500 mt-1 leading-relaxed">{activity.description}</p>
                )}
                <div className="flex items-center gap-1.5 mt-2.5">
                  <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-500">
                    {(activity.dueDate || activity.endDate) ? formatDate(activity.dueDate || activity.endDate) : "No Due Date"}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UpcomingDeadlines;
