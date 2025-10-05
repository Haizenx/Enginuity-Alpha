import { useEffect, useMemo, useState, useCallback, useRef } from "react"; // --- NEW: Added useRef
import Sidebar from "../components/Sidebar";
import ChatContainer from "../components/ChatContainer";
import toast from "react-hot-toast";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";

// --- NEW: Imports for authentication and socket connection ---
import { useAuthContext } from "../context/AuthContext";
import io from "socket.io-client";

// This API URL setup is correct.
const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:5001";
const SOCKET_URL = import.meta.env.DEV ? "http://localhost:5001" : import.meta.env.VITE_BACKEND_URL;

const ChatPage = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // --- NEW: Get auth info and manage online users ---
  const { authUser, token } = useAuthContext();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const socketRef = useRef(null);

  const bumpUserActivity = useCallback((userId, when = new Date().toISOString()) => {
    setUsers((prev) =>
      prev.map((u) =>
        u?._id === userId ? { ...u, lastActivity: when } : u
      )
    );
  }, []);

  // This useEffect for fetching the initial user list is good.
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    (async () => {
      setLoadingUsers(true);
      try {
        // ... (your existing fetch logic is fine)
        const res = await fetch(`${API_BASE}/api/messages/users`, {
          signal,
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to load users");
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.name !== 'AbortError') {
          toast.error(err.message || "Failed to load users");
        }
      } finally {
        if (!signal.aborted) {
          setLoadingUsers(false);
        }
      }
    })();

    return () => controller.abort();
  }, []);

  // --- NEW: useEffect to manage the real-time Socket.IO connection ---
  useEffect(() => {
    // Only connect if the user is logged in
    if (authUser && token) {
      const socket = io(SOCKET_URL, {
        query: { token }, // Send token for authentication
      });

      socketRef.current = socket;

      // Listen for the list of online users from the server
      socket.on("getOnlineUsers", (users) => {
        setOnlineUsers(users);
      });

      // Listen for new incoming messages
      socket.on("newMessage", (message) => {
        // When a new message arrives, update the user list to bring that conversation to the top
        bumpUserActivity(message.senderId, message.createdAt);
        toast.success(`New message from ${message.senderName || 'user'}`);
      });

      // Cleanup function to disconnect socket when component unmounts or user logs out
      return () => {
        socket.disconnect();
        socketRef.current = null;
      };
    } else {
      // If user logs out, ensure any existing socket is disconnected
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    }
  }, [authUser, token, bumpUserActivity]); // Re-run when auth state changes


  // ... The rest of your component logic and JSX is fine ...
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

  // Pass onlineUsers to the sidebar
  const sidebarProps = useMemo(
    () => ({
      users,
      selectedUser,
      onSelectUser: setSelectedUser,
      loading: loadingUsers,
      onlineUsers, // <-- Pass online users
    }),
    [users, selectedUser, loadingUsers, onlineUsers]
  );
  
  return (
    <div className="h-[calc(100vh-64px)] flex bg-base-100">
      <div
        className={`
          ${selectedUser ? 'hidden' : 'flex'} 
          w-full flex-col border-r border-base-300
          md:flex md:w-80 md:flex-shrink-0
        `}
      >
        <Sidebar {...sidebarProps} />
      </div>
      <div className={`
        ${!selectedUser ? 'hidden' : 'block'}
        w-full
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
