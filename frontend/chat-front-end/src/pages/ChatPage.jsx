import { useEffect, useMemo, useState, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import ChatContainer from "../components/ChatContainer";
import toast from "react-hot-toast";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline"; // Icon for empty state
import { axiosInstance } from "../lib/axios";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:5001";

const ChatPage = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const bumpUserActivity = useCallback((userId, when = new Date().toISOString()) => {
    setUsers((prev) =>
      prev.map((u) =>
        u?._id === userId ? { ...u, lastActivity: when } : u
      )
    );
  }, []);

  useEffect(() => {
    const controller = new AbortController(); // Modern way to handle unmounts
    const signal = controller.signal;

    (async () => {
      setLoadingUsers(true);
      try {
        const res = await axiosInstance.get("/messages/users", { signal });
        const data = res.data;
        const list = Array.isArray(data) ? data : [];
        const enriched = list.map((u) => ({ ...u, lastActivity: u.lastActivity || u.updatedAt || u.createdAt || null }));
        setUsers(enriched);

      } catch (err) {
        if (err.name !== 'AbortError') { // Don't show error if request was cancelled
          toast.error(err.message || "Failed to load users");
          setUsers([]);
        }
      } finally {
        // Check signal to avoid setting state on unmounted component
        if (!signal.aborted) {
          setLoadingUsers(false);
        }
      }
    })();

    // Cleanup function to abort the fetch request on component unmount
    return () => {
      controller.abort();
    };
  }, []);

  // keep selection valid if users list changes
  useEffect(() => {
    if (!selectedUser) return;
    const stillThere = users.some((u) => u?._id === selectedUser?._id);
    if (!stillThere) setSelectedUser(null);
  }, [users, selectedUser]);

  const onThreadLoaded = useCallback((userId, latestCreatedAt) => {
    if (!userId || !latestCreatedAt) return;
    bumpUserActivity(userId, latestCreatedAt);
  }, [bumpUserActivity]);

  const onMessageSent = useCallback((userId, createdAtISO) => {
    bumpUserActivity(userId, createdAtISO || new Date().toISOString());
  }, [bumpUserActivity]);

  const sidebarProps = useMemo(
    () => ({
      users,
      selectedUser,
      onSelectUser: setSelectedUser,
      loading: loadingUsers,
    }),
    [users, selectedUser, loadingUsers]
  );

  return (
    <main className="min-h-[calc(100vh-80px)] w-full bg-slate-50/50 relative py-8 px-4 sm:px-6 lg:px-8 flex justify-center items-center">
      {/* Ambient Background Blobs */}
      <div className="absolute top-20 left-20 w-[500px] h-[500px] bg-indigo-200/40 rounded-full blur-[120px] mix-blend-multiply pointer-events-none" />
      <div className="absolute bottom-20 right-20 w-[600px] h-[600px] bg-sky-200/40 rounded-full blur-[120px] mix-blend-multiply pointer-events-none" />

      <div className="w-full max-w-[1400px] h-[calc(100vh-140px)] min-h-[600px] bg-white/70 backdrop-blur-2xl rounded-[3rem] shadow-2xl border border-white flex overflow-hidden relative z-10">
        
        {/* -- RESPONSIVE SIDEBAR -- */}
        <div
          className={`
            ${selectedUser ? 'hidden' : 'flex'} 
            w-full flex-col border-r border-slate-200/50 bg-white/40
            md:flex md:w-96 md:flex-shrink-0
          `}
        >
          <Sidebar {...sidebarProps} />
        </div>

        {/* -- RESPONSIVE CHAT CONTAINER -- */}
        <div className={`
          ${!selectedUser ? 'hidden' : 'flex'}
          w-full flex-col relative
          md:flex md:flex-1
        `}>
          {selectedUser ? (
            <ChatContainer
              key={selectedUser._id}
              selectedUser={selectedUser}
              onThreadLoaded={onThreadLoaded}
              onMessageSent={onMessageSent}
              onClearSelection={() => setSelectedUser(null)}
            />
          ) : (
            // -- DESKTOP EMPTY STATE --
            <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-white/10 group">
              <div className="w-24 h-24 bg-white shadow-sm rounded-3xl flex items-center justify-center mb-6 border border-indigo-50 group-hover:scale-105 transition-transform duration-500">
                <ChatBubbleLeftRightIcon className="w-12 h-12 text-indigo-400" />
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight group-hover:text-indigo-900 transition-colors">Your Messages</h2>
              <p className="text-slate-500 font-medium text-lg max-w-sm text-center">Select a conversation from the sidebar or start a new one to begin chatting.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default ChatPage;
