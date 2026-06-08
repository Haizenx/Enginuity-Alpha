import { useMemo, useState } from "react";

const Sidebar = ({ users = [], selectedUser, onSelectUser, loading }) => {
  const [q, setQ] = useState("");

  const list = Array.isArray(users) ? users : [];

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = !term
      ? list
      : list.filter(
          (u) =>
            u?.fullName?.toLowerCase().includes(term) ||
            u?.email?.toLowerCase().includes(term)
        );
  
    // do NOT mutate base; sort a copy
    const copy = base.slice();
    copy.sort((a, b) => {
      const ta = new Date(a?.lastActivity || a?.updatedAt || a?.createdAt || 0).getTime();
      const tb = new Date(b?.lastActivity || b?.updatedAt || b?.createdAt || 0).getTime();
      if (tb !== ta) return tb - ta;
      return String(a?.fullName || "").localeCompare(String(b?.fullName || ""));
    });
    return copy;
  }, [q, list]);

  return (
    <aside className="w-full h-full flex flex-col">
      {/* Header / Search */}
      <div className="p-6 pb-2">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-4">Messages</h2>
        <div className="relative group">
          <input
            className="w-full bg-white/60 border border-slate-200/60 text-slate-800 text-sm rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block pl-10 p-3 shadow-sm transition-all outline-none placeholder:text-slate-400 group-hover:bg-white"
            placeholder="Search conversations..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <svg className="w-5 h-5 text-slate-400 absolute left-3 top-3.5 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
      </div>

      <div className="px-6 py-3 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Contacts</span>
        <span className="text-xs font-bold bg-slate-200/50 text-slate-500 px-2 py-0.5 rounded-full">{(list?.length ?? 0)}</span>
      </div>

      {/* User List */}
      <ul className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5 custom-scrollbar">
        {loading && <li className="px-4 py-4 text-sm text-slate-500 font-medium text-center animate-pulse">Loading contacts...</li>}
        {!loading && filtered.length === 0 && (
          <li className="px-4 py-8 text-sm text-slate-400 font-medium text-center">No conversations found.</li>
        )}
        {!loading &&
          filtered.map((u) => {
            const isSelected = selectedUser?._id === u?._id;
            return (
              <li
                key={u?._id}
                className={`p-3 rounded-2xl cursor-pointer transition-all duration-200 group ${
                  isSelected 
                    ? "bg-indigo-600 shadow-md shadow-indigo-600/20 translate-x-1" 
                    : "hover:bg-white hover:shadow-sm hover:-translate-y-0.5 border border-transparent hover:border-slate-100"
                }`}
                onClick={() => onSelectUser?.(u)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      className={`w-12 h-12 rounded-full object-cover shadow-sm transition-all ${isSelected ? "ring-2 ring-indigo-400" : "group-hover:ring-2 group-hover:ring-slate-200"}`}
                      src={u?.profilePic || "/avatar.png"}
                      alt={u?.fullName || "User"}
                    />
                    {/* Add online dot if needed (can be passed via props later) */}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`font-bold truncate ${isSelected ? "text-white" : "text-slate-800"}`}>
                      {u?.fullName || "Unknown user"}
                    </div>
                    <div className={`text-xs truncate font-medium ${isSelected ? "text-indigo-200" : "text-slate-500"}`}>
                      {u?.email || "No email"}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
      </ul>
    </aside>
  );
};

export default Sidebar;
