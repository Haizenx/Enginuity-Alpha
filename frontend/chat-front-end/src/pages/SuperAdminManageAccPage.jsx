import React, { useEffect, useState } from "react";
import axiosInstance from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";
import {
  Users2,
  Shield,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Check,
  X,
  Lock,
  Unlock,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

// Shared UI
const SectionHeader = ({ title, subtitle, children }) => (
  <div className="flex items-end justify-between mb-3">
    <div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-base-content/70">{subtitle}</p>
    </div>
    <div className="flex items-center gap-2">{children}</div>
  </div>
);

const Toolbar = ({ children }) => (
  <div className="flex flex-wrap items-center gap-2 mb-3">{children}</div>
);

const TextInput = ({ icon, ...props }) => (
  <div className="relative">
    {icon && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-base-content/60">{icon}</span>}
    <input
      className={`input input-bordered ${icon ? "pl-8" : ""}`}
      {...props}
    />
  </div>
);

const Select = (props) => <select className="select select-bordered" {...props} />;

const Pagination = ({ page, total, limit, onPage }) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="flex items-center justify-between mt-3">
      <span className="text-sm text-base-content/70">
        Page {page} of {totalPages}
      </span>
      <div className="join">
        <button className="btn btn-sm join-item" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          «
        </button>
        <button className="btn btn-sm join-item" disabled>
          {page}
        </button>
        <button
          className="btn btn-sm join-item"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          »
        </button>
      </div>
    </div>
  );
};

// Create user modal
const CreateUserModal = ({ open, onClose, onCreated }) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("project_manager");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setFullName("");
      setEmail("");
      setRole("project_manager");
      setPassword("");
      setLoading(false);
    }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !password || !role) {
      return toast.error("Please fill in all fields.");
    }
    setLoading(true);
    try {
      const { data } = await axiosInstance.post("/admin/users", {
        fullName,
        email,
        role,
        password,
        isActive: true,
      });
      toast.success("User created");
      onCreated?.(data);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-base-100 rounded-xl shadow-xl w-full max-w-md p-5 z-10">
        <h3 className="text-lg font-semibold mb-3">Create user</h3>
        <form className="space-y-3" onSubmit={submit}>
          <input className="input input-bordered w-full" placeholder="Full name" value={fullName} onChange={(e)=>setFullName(e.target.value)} />
          <input className="input input-bordered w-full" placeholder="Email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <Select value={role} onChange={(e)=>setRole(e.target.value)}>
            <option value="project_manager">Project Manager</option>
            <option value="client">Client</option>
          </Select>
          <input className="input input-bordered w-full" placeholder="Temp password" value={password} onChange={(e)=>setPassword(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost" type="button" onClick={onClose} disabled={loading}>Cancel</button>
            <button className={`btn btn-primary ${loading ? "loading" : ""}`} disabled={loading} type="submit">
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Fulfill/Deny modal
const ResetActionModal = ({ open, mode, request, onClose, onDone }) => {
  const [newPassword, setNewPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setNewPassword("");
      setNotes("");
      setLoading(false);
    }
  }, [open]);

  const submit = async () => {
    if (!request?._id) return onClose();
    setLoading(true);
    try {
      if (mode === "fulfill") {
        await axiosInstance.post(`/admin/manager-reset-requests/${request._id}/fulfill`, {
          newPassword,
          notes: notes || "Admin reset via UI",
          mustChangeAtNextLogin: false,
        });
        toast.success("Password updated by admin");
      } else {
        await axiosInstance.post(`/admin/manager-reset-requests/${request._id}/deny`, {
          notes: notes || "Denied via UI",
        });
        toast.success("Request denied");
      }
      onDone?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  const isFulfill = mode === "fulfill";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-base-100 rounded-xl shadow-xl w-full max-w-md p-5 z-10">
        <h3 className="text-lg font-semibold mb-3">
          {isFulfill ? "Fulfill reset request" : "Deny reset request"}
        </h3>
        <div className="space-y-3">
          {isFulfill && (
            <input
              className="input input-bordered w-full"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          )}
          <textarea
            className="textarea textarea-bordered w-full"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
            <button className={`btn ${isFulfill ? "btn-primary" : "btn-error"} ${loading ? "loading" : ""}`} onClick={submit} disabled={loading}>
              {loading ? "Working..." : isFulfill ? "Fulfill" : "Deny"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SuperAdminManageAccPage = () => {
  const { authUser } = useAuthStore();
  const isSA = authUser?.role === "superadmin" || authUser?.userType === "superadmin";

  // Tabs
  const [tab, setTab] = useState("users"); // 'users' | 'requests'

  // Users state
  const [users, setUsers] = useState([]);
  const [uLoading, setULoading] = useState(false);
  const [uPage, setUPage] = useState(1);
  const [uLimit, setULimit] = useState(10);
  const [uTotal, setUTotal] = useState(0);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);

  // Requests state
  const [reqs, setReqs] = useState([]);
  const [rLoading, setRLoading] = useState(false);
  const [rPage, setRPage] = useState(1);
  const [rLimit, setRLimit] = useState(10);
  const [rTotal, setRTotal] = useState(0);
  const [rStatus, setRStatus] = useState("pending");
  const [actionOpen, setActionOpen] = useState(false);
  const [actionMode, setActionMode] = useState("fulfill");
  const [selectedReq, setSelectedReq] = useState(null);

  // Fetch users
  const fetchUsers = async () => {
    setULoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(uPage));
      params.set("limit", String(uLimit));
      if (q) params.set("q", q);
      if (role !== "all") params.set("role", role);
      if (status !== "all") params.set("status", status);
      const { data } = await axiosInstance.get(`/admin/users?${params.toString()}`);
      setUsers(data?.data || data?.users || []);
      setUTotal(data?.total ?? 0);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load users");
    } finally {
      setULoading(false);
    }
  };

  // Fetch requests
  const fetchRequests = async () => {
    setRLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("status", rStatus);
      params.set("page", String(rPage));
      params.set("limit", String(rLimit));
      const { data } = await axiosInstance.get(`/admin/manager-reset-requests?${params.toString()}`);
      setReqs(data?.data || []);
      setRTotal(data?.total ?? 0);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load reset requests");
    } finally {
      setRLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "users") fetchUsers();
  }, [tab, uPage, uLimit, role, status]); // q triggers on search button

  useEffect(() => {
    if (tab === "requests") fetchRequests();
  }, [tab, rPage, rLimit, rStatus]);

  const deactivate = async (user) => {
    try {
      const { data } = await axiosInstance.patch(`/users/${user._id}/status`, {
        isActive: !user.isActive,
      });
      toast.success(data?.isActive ? "User reactivated" : "User deactivated");
      fetchUsers();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update status");
    }
  };

  const handleDeleteUser = async (user) => {
    if (window.confirm(`Are you sure you want to permanently delete ${user.fullName}? This action cannot be undone.`)) {
      try {
        await axiosInstance.delete(`/users/${user._id}`);
        toast.success("User deleted successfully.");
        fetchUsers();
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to delete user.");
      }
    }
  };

  const openFulfill = (req) => {
    setSelectedReq(req);
    setActionMode("fulfill");
    setActionOpen(true);
  };
  const openDeny = (req) => {
    setSelectedReq(req);
    setActionMode("deny");
    setActionOpen(true);
  };

  if (!isSA) {
    return (
      <div className="p-6">
        <div className="alert alert-error">
          <span>Access denied.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users2 size={22} />
        <Shield size={18} className="opacity-70" />
        <h1 className="text-2xl font-semibold">Manage accounts</h1>
      </div>

      {/* Tabs */}
      <div role="tablist" className="tabs tabs-bordered mb-4">
        <button role="tab" className={`tab ${tab === "users" ? "tab-active" : ""}`} onClick={() => setTab("users")}>
          Users
        </button>
        <button
          role="tab"
          className={`tab ${tab === "requests" ? "tab-active" : ""}`}
          onClick={() => setTab("requests")}
        >
          Password reset requests
        </button>
      </div>

      {tab === "users" && (
        <div>
          <SectionHeader title="All users" subtitle="Search, filter, and manage accounts">
            <button className="btn btn-outline btn-sm" onClick={fetchUsers}>
              <RefreshCw size={16} />
              Refresh
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              New user
            </button>
          </SectionHeader>

          <Toolbar>
            <TextInput
              icon={<Search size={16} />}
              placeholder="Search name or email"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button className="btn btn-sm" onClick={() => { setUPage(1); fetchUsers(); }}>
              <Filter size={16} />
              Search
            </button>
            <Select value={role} onChange={(e) => { setRole(e.target.value); setUPage(1); }}>
              <option value="all">All roles</option>
              <option value="project_manager">Project Manager</option>
              <option value="client">Client</option>
              <option value="superadmin">Super Admin</option>
            </Select>
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setUPage(1); }}>
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
            <Select value={uLimit} onChange={(e)=>setULimit(Number(e.target.value))}>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </Select>
          </Toolbar>

          <div className="overflow-x-auto rounded-xl border border-base-300">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {uLoading ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="flex items-center justify-center py-6">
                        <span className="loading loading-spinner" />
                      </div>
                    </td>
                  </tr>
                ) : users.length ? (
                  users.map((u) => (
                    <tr key={u._id}>
                      <td>{u.fullName}</td>
                      <td className="font-mono text-sm">{u.email}</td>
                      <td className="capitalize">{u.role}</td>
                      <td>
                        {u.isActive ? (
                          <span className="badge badge-success">active</span>
                        ) : (
                          <span className="badge">inactive</span>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="join">
                          <button
                            className="btn btn-xs join-item"
                            onClick={() => deactivate(u)}
                            title={u.isActive ? "Deactivate" : "Reactivate"}
                          >
                            {u.isActive ? <Lock size={14} /> : <Unlock size={14} />}
                          </button>
                          <button
                            className="btn btn-xs btn-error join-item"
                            onClick={() => handleDeleteUser(u)}
                            title="Delete User Permanently"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-6">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination page={uPage} total={uTotal} limit={uLimit} onPage={setUPage} />
        </div>
      )}

      {tab === "requests" && (
        <div>
          <SectionHeader title="Password reset requests" subtitle="Approve or deny queued resets">
            <button className="btn btn-outline btn-sm" onClick={fetchRequests}>
              <RefreshCw size={16} />
              Refresh
            </button>
          </SectionHeader>

          <Toolbar>
            <Select value={rStatus} onChange={(e)=>{ setRStatus(e.target.value); setRPage(1); }}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
            </Select>
            <Select value={rLimit} onChange={(e)=>setRLimit(Number(e.target.value))}>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </Select>
          </Toolbar>

          <div className="overflow-x-auto rounded-xl border border-base-300">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Requested for</th>
                  <th>Email</th>
                  <th>Requested at</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rLoading ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="flex items-center justify-center py-6">
                        <span className="loading loading-spinner" />
                      </div>
                    </td>
                  </tr>
                ) : reqs.length ? (
                  reqs.map((r) => (
                    <tr key={r._id}>
                      <td>{r.managerUserId?.fullName || "—"}</td>
                      <td className="font-mono text-sm">{r.managerUserId?.email || "—"}</td>
                      <td>{new Date(r.requestedAt).toLocaleString()}</td>
                      <td className="capitalize">{r.status}</td>
                      <td className="text-right">
                        <div className="join">
                          <button
                            className="btn btn-xs btn-success join-item"
                            onClick={() => openFulfill(r)}
                            disabled={r.status !== "pending"}
                            title="Fulfill"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            className="btn btn-xs btn-error join-item"
                            onClick={() => openDeny(r)}
                            disabled={r.status !== "pending"}
                            title="Deny"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-6">
                      No requests.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination page={rPage} total={rTotal} limit={rLimit} onPage={setRPage} />
        </div>
      )}

      {/* Modals */}
      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => fetchUsers()} />
      <ResetActionModal
        open={actionOpen}
        mode={actionMode}
        request={selectedReq}
        onClose={() => setActionOpen(false)}
        onDone={() => fetchRequests()}
      />
    </div>
  );
};

export default SuperAdminManageAccPage;
