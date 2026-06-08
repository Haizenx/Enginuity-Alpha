import React, { useMemo, useState } from "react";
import { Plus, Trash2, Calendar, Filter } from "lucide-react";
import toast from "react-hot-toast";

const ActivitiesCard = ({ activities = [], onAdd, onDelete }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filter, setFilter] = useState("all"); // all | upcoming | completed
  const [sortBy, setSortBy] = useState("start"); // start | end

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    await onAdd({
      name: trimmed,
      description: description.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined, // page maps endDate -> dueDate
      status: "pending",
    });

    setName("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setIsAdding(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const filteredSorted = useMemo(() => {
    let list = Array.isArray(activities) ? activities.slice() : [];
    if (filter === "upcoming") {
      list = list.filter((a) => a.status !== "completed");
    } else if (filter === "completed") {
      list = list.filter((a) => a.status === "completed");
    }
    list.sort((a, b) => {
      const aKey = sortBy === "start" ? a.startDate : a.dueDate || a.endDate;
      const bKey = sortBy === "start" ? b.startDate : b.dueDate || b.endDate;
      return new Date(aKey || 0) - new Date(bKey || 0);
    });
    return list;
  }, [activities, filter, sortBy]);

  // Promise-based toast confirm
  const confirmToast = (message, confirmLabel = "Remove", cancelLabel = "Cancel") =>
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

  const handleDelete = async (activity) => {
    const title = activity?.name || "this activity";
    const ok = await confirmToast(`Delete "${title}" from the list?`);
    if (!ok) return;
    await onDelete?.(activity._id || activity.id);
    toast.success(`"${title}" deleted`);
  };

  return (
    <div className="card bg-base-100 shadow-md w-full">
      <div className="card-body p-4 md:p-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="text-lg font-semibold text-base-content">Activities</h3>

          {/* Right controls can wrap */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filters: compact, visible on all screens */}
            <div className="join">
              <button
                className={`btn btn-xs btn-ghost join-item ${filter === "all" ? "btn-active" : ""}`}
                onClick={() => setFilter("all")}
                title="Show all"
              >
                All
              </button>
              <button
                className={`btn btn-xs btn-ghost join-item ${filter === "upcoming" ? "btn-active" : ""}`}
                onClick={() => setFilter("upcoming")}
                title="Show upcoming"
              >
                Upcoming
              </button>
              <button
                className={`btn btn-xs btn-ghost join-item ${filter === "completed" ? "btn-active" : ""}`}
                onClick={() => setFilter("completed")}
                title="Show completed"
              >
                Done
              </button>
            </div>

            {/* Sort dropdown: compact text on sm+ */}
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-xs">
                <Filter className="h-3 w-3" />
                <span className="hidden sm:inline">Sort</span>
              </div>
              <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-44">
                <li>
                  <button
                    className={`${sortBy === "start" ? "active" : ""}`}
                    onClick={() => setSortBy("start")}
                  >
                    By start date
                  </button>
                </li>
                <li>
                  <button
                    className={`${sortBy === "end" ? "active" : ""}`}
                    onClick={() => setSortBy("end")}
                  >
                    By end date
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Add Activity Form */}
        {isAdding && (
          <div className="mb-4 p-4 bg-base-200 rounded-lg">
            <input
              className="input input-bordered input-sm w-full mb-3"
              placeholder="Client check site and meeting"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <textarea
              className="textarea textarea-bordered textarea-sm w-full mb-3 resize-none"
              placeholder="Meeting with the client at the construction site to further discuss plans."
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              <input
                className="input input-bordered input-sm"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Start date"
              />
              <input
                className="input input-bordered input-sm"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="End date"
              />
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary btn-sm flex-1" onClick={handleAdd}>
                Add Activity
              </button>
              <button
                className="btn btn-ghost btn-sm flex-1"
                onClick={() => {
                  setIsAdding(false);
                  setName("");
                  setDescription("");
                  setStartDate("");
                  setEndDate("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Activities List (no checkboxes) */}
        <div className="space-y-3 mb-4">
          {Array.isArray(filteredSorted) && filteredSorted.length > 0 ? (
            filteredSorted.map((act) => (
              <div
                key={act._id || act.id}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-base-200/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4
                        className={`font-medium text-sm ${
                          act.status === "completed" ? "line-through text-base-content/60" : "text-base-content"
                        }`}
                      >
                        {act.name || "Untitled"}
                      </h4>
                      {act.description && (
                        <p className="text-xs text-base-content/70 mt-1">{act.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-base-content/60 mt-1">
                        {act.startDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Start: {formatDate(act.startDate)}</span>
                          </div>
                        )}
                        {(act.dueDate || act.endDate) && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>End: {formatDate(act.dueDate || act.endDate)}</span>
                          </div>
                        )}
                        {act.status && (
                          <span
                            className={`badge badge-xs ${
                              act.status === "completed" ? "badge-success" : "badge-ghost"
                            }`}
                          >
                            {act.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(act)}
                      className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                      title="Delete activity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-base-content/60">
              <Calendar className="mx-auto h-12 w-12 mb-2 opacity-50" />
              <p>No activities yet.</p>
            </div>
          )}
        </div>

        {/* Add Activity Button */}
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} className="btn btn-primary btn-sm w-full gap-2">
            <Plus className="h-4 w-4" />
            Add Activity
          </button>
        )}
      </div>
    </div>
  );
};

export default ActivitiesCard;
