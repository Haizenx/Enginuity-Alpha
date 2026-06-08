import React, { useState } from "react";
import { User, Trash2, Plus, Search, DollarSign, Calendar } from "lucide-react";
import toast from "react-hot-toast";

const EmployeesCard = ({ employees = [], onAdd, onRemove }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [wagePerDay, setWagePerDay] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleAdd = async () => {
    const n = name.trim();
    const r = role.trim();
    if (!n || !r) return;

    const payload = {
      name: n,
      role: r,
      wagePerDay: wagePerDay ? Number(wagePerDay) : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined, // page maps to dueDate
    };

    await onAdd(payload);

    setName("");
    setRole("");
    setWagePerDay("");
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
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleRemove = async (emp) => {
    const name = emp?.name || "this employee";
    const ok = await confirmToast(`Remove ${name} from the project?`);
    if (!ok) return;

    await onRemove(emp._id || emp.id);
    toast.success(`${name} removed`);
  };

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-base-content">Assigned Employees</h3>
          <button onClick={() => setIsAdding(true)} className="btn btn-xs btn-primary gap-1">
            <Plus className="h-3 w-3" />
            Add Employee
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/40 h-4 w-4" />
          <input
            type="text"
            placeholder="Search employees..."
            className="input input-sm input-bordered w-full pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Add Employee Form */}
        {isAdding && (
          <div className="mb-4 p-4 bg-base-200 rounded-lg">
            <div className="grid grid-cols-2 gap-2 mb-3">
              <input
                className="input input-bordered input-sm"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="input input-bordered input-sm"
                placeholder="Role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </div>
            <input
              className="input input-bordered input-sm w-full mb-3"
              placeholder="Wage/day"
              type="number"
              value={wagePerDay}
              onChange={(e) => setWagePerDay(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2 mb-3">
              <input
                className="input input-bordered input-sm"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-label="Start date"
              />
              <input
                className="input input-bordered input-sm"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                aria-label="End date"
              />
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary btn-sm flex-1" onClick={handleAdd}>
                <Plus className="h-3 w-3" />
                Add Employee
              </button>
              <button
                className="btn btn-ghost btn-sm flex-1"
                onClick={() => {
                  setIsAdding(false);
                  setName("");
                  setRole("");
                  setWagePerDay("");
                  setStartDate("");
                  setEndDate("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Employees List */}
        <div className="space-y-3">
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-base-content/60">
              <User className="mx-auto h-12 w-12 mb-2 opacity-50" />
              <p>{searchTerm ? "No employees found" : "No employees assigned"}</p>
            </div>
          ) : (
            filteredEmployees.map((emp) => (
              <div key={emp._id || emp.id} className="p-3 border rounded-lg hover:bg-base-200/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-primary text-xs font-medium">
                          {emp.name?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-base-content">{emp.name || "Unnamed"}</h4>
                        <p className="text-xs text-base-content/70">{emp.role || "No role specified"}</p>
                      </div>
                    </div>
                    <div className="ml-10 space-y-1">
                      {emp.wagePerDay && (
                        <div className="flex items-center gap-1 text-xs text-base-content/60">
                          <DollarSign className="h-3 w-3" />
                          ₱{emp.wagePerDay}/day
                        </div>
                      )}
                      {(emp.startDate || emp.endDate) && (
                        <div className="flex items-center gap-1 text-xs text-base-content/60">
                          <Calendar className="h-3 w-3" />
                          {emp.startDate && formatDate(emp.startDate)}
                          {emp.endDate && ` - ${formatDate(emp.endDate)}`}
                          {emp.startDate && !emp.endDate && " - Ongoing"}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(emp)}
                    className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                    title="Remove employee"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeesCard;
