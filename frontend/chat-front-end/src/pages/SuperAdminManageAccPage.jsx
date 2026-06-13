import React, { useEffect, useState } from "react";
import { axiosInstance } from "../lib/axios";
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
  KeyRound,
  UserPlus,
  CheckCircle2
} from "lucide-react";
import toast from "react-hot-toast";

// Shared UI
const SectionHeader = ({ title, subtitle, children }) => (
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
    <div>
      <h2 className="text-3xl font-black text-slate-800 tracking-tight">{title}</h2>
      <p className="text-sm font-medium text-slate-500 mt-1">{subtitle}</p>
    </div>
    <div className="flex items-center gap-3">{children}</div>
  </div>
);

const Toolbar = ({ children }) => (
  <div className="flex flex-wrap items-center gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">{children}</div>
);

const TextInput = ({ icon, ...props }) => (
  <div className="relative flex-grow max-w-sm">
    {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>}
    <input
      className={`bg-white border border-slate-200 text-slate-800 font-medium text-sm rounded-xl py-2.5 outline-none shadow-sm w-full focus:ring-2 focus:ring-indigo-500 transition-colors ${icon ? "pl-10 pr-4" : "px-4"}`}
      {...props}
    />
  </div>
);

const Select = (props) => (
  <select 
    className="bg-white border border-slate-200 text-slate-800 font-medium text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-pointer hover:border-slate-300 transition-colors" 
    {...props} 
  />
);

const Pagination = ({ page, total, limit, onPage }) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="flex items-center justify-between mt-6 bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100">
      <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
        Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <button 
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors shadow-sm font-bold" 
          disabled={page <= 1} 
          onClick={() => onPage(page - 1)}
        >
          «
        </button>
        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 font-black shadow-sm">
          {page}
        </div>
        <button
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors shadow-sm font-bold"
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
const CreateUserModal = ({ open, onClose, onCreated, setCreatedCreds }) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("project_manager");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setFullName("");
      setEmail("");
      setRole("project_manager");
      setLoading(false);
    }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !role) {
      return toast.error("Please fill in all fields.");
    }
    setLoading(true);
    try {
      const endpoint = role === "project_manager" ? "/users/create-pm-auto" : "/users/create-client-auto";
      const { data } = await axiosInstance.post(endpoint, {
        fullName,
        email,
        contactNumber: "Pending", // Temp value as the schema might expect it
      });
      
      toast.success(data?.message || "User created");
      
      const creds = data?.credentials || {};
      setCreatedCreds({
        email: creds.email,
        username: creds.username,
        password: creds.password,
        emailSent: data?.emailSent === true,
      });

      if (data?.emailSent) {
        toast.success(`Credentials emailed to the ${role.replace("_", " ")}.`);
      } else {
        toast("User created; emailing credentials failed. Share manually.", { icon: "✉️" });
      }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 z-10 border border-slate-100 scale-in-center">
        <div className="flex items-center gap-3 mb-6">
           <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <UserPlus size={24} />
           </div>
           <div>
             <h3 className="text-2xl font-black text-slate-800 tracking-tight">Create User</h3>
             <p className="text-xs font-medium text-slate-500 mt-1">Username and temp password will be generated automatically.</p>
           </div>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <input className="bg-slate-50 border border-slate-200 text-slate-800 font-medium text-sm rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm w-full transition-colors focus:bg-white" placeholder="Full name *" value={fullName} onChange={(e)=>setFullName(e.target.value)} />
          <input className="bg-slate-50 border border-slate-200 text-slate-800 font-medium text-sm rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm w-full transition-colors focus:bg-white" placeholder="Email address *" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <select className="bg-slate-50 border border-slate-200 text-slate-800 font-medium text-sm rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm w-full transition-colors focus:bg-white cursor-pointer" value={role} onChange={(e)=>setRole(e.target.value)}>
            <option value="project_manager">Project Manager</option>
            <option value="client">Client</option>
          </select>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <button className="px-6 py-3 rounded-xl font-bold tracking-wide text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors" type="button" onClick={onClose} disabled={loading}>Cancel</button>
            <button className="px-6 py-3 rounded-xl font-bold tracking-wide text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2" disabled={loading} type="submit">
              {loading ? "Creating..." : "Create Account"}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 z-10 border border-slate-100 scale-in-center">
        <div className="flex items-center gap-3 mb-6">
           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isFulfill ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {isFulfill ? <Check size={24} /> : <X size={24} />}
           </div>
           <h3 className="text-2xl font-black text-slate-800 tracking-tight">
             {isFulfill ? "Fulfill Request" : "Deny Request"}
           </h3>
        </div>
        <div className="space-y-4">
          {isFulfill && (
            <input
              className="bg-slate-50 border border-slate-200 text-slate-800 font-medium text-sm rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm w-full transition-colors focus:bg-white"
              placeholder="New password *"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          )}
          <textarea
            className="bg-slate-50 border border-slate-200 text-slate-800 font-medium text-sm rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm w-full transition-colors focus:bg-white min-h-[100px]"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <button className="px-6 py-3 rounded-xl font-bold tracking-wide text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors" onClick={onClose} disabled={loading}>Cancel</button>
            <button className={`px-6 py-3 rounded-xl font-bold tracking-wide text-sm text-white transition-all shadow-sm ${isFulfill ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600"}`} onClick={submit} disabled={loading}>
              {loading ? "Working..." : isFulfill ? "Fulfill Reset" : "Deny Request"}
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
  const [createdCreds, setCreatedCreds] = useState(null);

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
      const endpoint = user.isActive 
        ? `/admin/users/${user._id}/deactivate`
        : `/admin/users/${user._id}/reactivate`;
        
      const { data } = await axiosInstance.patch(endpoint);
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

  const handleForceResetPassword = async (user) => {
    if (window.confirm(`Force a password reset for ${user.fullName}?`)) {
      try {
        const { data } = await axiosInstance.post(`/admin/users/${user._id}/force-reset`);
        toast.success("Password reset successfully.");
        setCreatedCreds({
          username: user.email,
          password: data.tempPassword,
          emailSent: data.emailSent
        });
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to force reset password.");
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
      <div className="p-12 min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-2xl shadow-sm flex items-center gap-3">
           <Shield className="w-6 h-6 text-rose-500" />
           <span className="font-semibold">Access denied. Superadmin privileges required.</span>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full bg-slate-50/50 relative py-12 px-4 sm:px-6 lg:px-8 pb-32">
      {/* Ambient Background Blobs */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-200/40 rounded-full blur-[120px] mix-blend-multiply pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-sky-200/40 rounded-full blur-[120px] mix-blend-multiply pointer-events-none" />

      <div className="max-w-[1400px] mx-auto relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
             <Shield size={28} />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight">Manage Accounts</h1>
            <p className="text-lg font-medium text-slate-500 mt-2">Control system access, roles, and password requests.</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-col sm:flex-row gap-2 mb-8 bg-white/60 p-2 rounded-2xl backdrop-blur-md border border-white shadow-sm inline-flex">
          <button
            onClick={() => setTab("users")}
            className={`px-6 py-3 rounded-xl font-bold tracking-wide text-sm transition-all flex items-center gap-2 ${
              tab === "users" 
                ? "bg-indigo-600 text-white shadow-md" 
                : "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            <Users2 size={18} />
            System Users
          </button>
        </div>

        {tab === "users" && (
          <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-shadow animate-in fade-in duration-500">
            <SectionHeader title="All Users" subtitle="Search, filter, and manage account statuses.">
              <button className="px-5 py-2.5 rounded-xl font-bold tracking-wide text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex items-center gap-2" onClick={fetchUsers}>
                <RefreshCw size={16} />
                Refresh
              </button>
              <button className="px-5 py-2.5 rounded-xl font-bold tracking-wide text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2" onClick={() => setCreateOpen(true)}>
                <UserPlus size={16} />
                New User
              </button>
            </SectionHeader>

            <Toolbar>
              <TextInput
                icon={<Search size={18} />}
                placeholder="Search name or email..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors" onClick={() => { setUPage(1); fetchUsers(); }}>
                <Search size={18} />
              </button>
              <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
              <Select value={role} onChange={(e) => { setRole(e.target.value); setUPage(1); }}>
                <option value="all">All Roles</option>
                <option value="project_manager">Project Manager</option>
                <option value="client">Client</option>
                <option value="superadmin">Super Admin</option>
              </Select>
              <Select value={status} onChange={(e) => { setStatus(e.target.value); setUPage(1); }}>
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
              <div className="ml-auto">
                 <Select value={uLimit} onChange={(e)=>setULimit(Number(e.target.value))}>
                   <option value={10}>10 per page</option>
                   <option value={20}>20 per page</option>
                   <option value={50}>50 per page</option>
                 </Select>
              </div>
            </Toolbar>

            <div className="overflow-x-auto rounded-[1.5rem] border border-slate-100 shadow-sm bg-white">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-widest">
                  <tr>
                    <th className="py-4 px-6">Name</th>
                    <th className="py-4 px-6">Email</th>
                    <th className="py-4 px-6">Role</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {uLoading ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="flex items-center justify-center py-12">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                      </td>
                    </tr>
                  ) : users.length ? (
                    users.map((u) => (
                      <tr key={u._id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="py-4 px-6 font-bold text-slate-800">{u.fullName}</td>
                        <td className="py-4 px-6 font-medium text-slate-500">{u.email}</td>
                        <td className="py-4 px-6">
                           <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                              {u.role.replace('_', ' ')}
                           </span>
                        </td>
                        <td className="py-4 px-6">
                          {u.isActive ? (
                            <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">Active</span>
                          ) : (
                            <span className="bg-rose-50 text-rose-600 border border-rose-100 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">Inactive</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-500 hover:text-white border border-indigo-100 transition-colors shadow-sm"
                              onClick={() => handleForceResetPassword(u)}
                              title="Force Reset Password"
                            >
                              <KeyRound size={14} />
                            </button>
                            <button
                              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors shadow-sm border ${u.isActive ? 'bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white border-amber-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border-emerald-100'}`}
                              onClick={() => deactivate(u)}
                              title={u.isActive ? "Deactivate User" : "Reactivate User"}
                            >
                              {u.isActive ? <Lock size={14} /> : <Unlock size={14} />}
                            </button>
                            <button
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white border border-rose-100 transition-colors shadow-sm"
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
                      <td colSpan={5} className="text-center py-12 text-slate-500 font-medium">
                        <Users2 className="w-8 h-8 mx-auto text-slate-300 mb-3" />
                        No users found matching the criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination page={uPage} total={uTotal} limit={uLimit} onPage={setUPage} />
          </div>
        )}

      </div>

      {/* Modals */}
      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => fetchUsers()} setCreatedCreds={setCreatedCreds} />
      <ResetActionModal
        open={actionOpen}
        mode={actionMode}
        request={selectedReq}
        onClose={() => setActionOpen(false)}
        onDone={() => fetchRequests()}
      />

      {/* Credentials Created Modal */}
      {createdCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setCreatedCreds(null)} />
          <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 z-10 border border-slate-100 scale-in-center text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-6 shadow-inner">
               <CheckCircle2 size={32} />
            </div>
            
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Account Created!</h3>
            
            {"emailSent" in createdCreds ? (
              createdCreds.emailSent ? (
                <div className="inline-block bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border border-emerald-100 mb-6">Email Automatically Sent</div>
              ) : (
                <div className="inline-block bg-rose-50 text-rose-600 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border border-rose-100 mb-6">Email Delivery Failed</div>
              )
            ) : null}

            <p className="text-sm font-medium text-slate-500 mb-6">Please securely share these temporary credentials with the user.</p>
            
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-3 mb-8">
              <div>
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Username</span>
                 <span className="font-mono font-bold text-slate-800 text-sm bg-white px-3 py-1.5 rounded-lg border border-slate-200 block shadow-sm">{createdCreds.username || createdCreds.email}</span>
              </div>
              <div>
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Temp Password</span>
                 <span className="font-mono font-bold text-slate-800 text-sm bg-white px-3 py-1.5 rounded-lg border border-slate-200 block shadow-sm">{createdCreds.password}</span>
              </div>
            </div>

            <button className="w-full py-3.5 rounded-xl font-bold tracking-wide text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm" onClick={() => setCreatedCreds(null)}>
               Acknowledge & Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default SuperAdminManageAccPage;
