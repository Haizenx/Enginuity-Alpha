import { useEffect, useMemo, useState, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import ChatContainer from "../components/ChatContainer";
import toast from "react-hot-toast";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline"; // Icon for empty state

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";

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
        const res = await fetch(`${API_BASE}/api/messages/users`, {
          signal, // Pass the signal to the fetch request
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          let errorMsg = "Failed to load users";
          try {
            const errorData = await res.json();
            errorMsg = errorData?.message || errorData?.error || errorMsg;
          } catch {
            // response was not json
          }
          throw new Error(errorMsg);
        }

        const data = await res.json();
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
    <div className="h-[calc(100vh-64px)] flex bg-base-100">
      {/* -- RESPONSIVE SIDEBAR --
        - On mobile (hidden md:...), it's hidden if a user is selected.
        - On desktop (md:flex), it's always visible with a fixed width.
      */}
      <div
        className={`
          ${selectedUser ? 'hidden' : 'flex'} 
          w-full flex-col border-r border-base-300
          md:flex md:w-80 md:flex-shrink-0
        `}
      >
        <Sidebar {...sidebarProps} />
      </div>

      {/* -- RESPONSIVE CHAT CONTAINER --
        - On mobile (block md:...), it's hidden if NO user is selected.
        - On desktop (md:flex), it's always visible and takes remaining space.
      */}
      <div className={`
        ${!selectedUser ? 'hidden' : 'block'}
        w-full
        md:flex md:flex-1
      `}>
        {selectedUser ? (
          <ChatContainer
            key={selectedUser._id} // Add key to force re-mount on user change
            selectedUser={selectedUser}
            onThreadLoaded={onThreadLoaded}
            onMessageSent={onMessageSent}
            // Pass a function to allow going "back" on mobile
            onClearSelection={() => setSelectedUser(null)}
          />
        ) : (
          // -- DESKTOP EMPTY STATE --
          // This part is hidden on mobile because the parent div is hidden
          <div className="flex flex-col items-center justify-center h-full text-base-content/60">
            <ChatBubbleLeftRightIcon className="w-24 h-24 mb-4" />
            <h2 className="text-2xl font-semibold">Select a conversation</h2>
            <p>Choose from an existing conversation to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;