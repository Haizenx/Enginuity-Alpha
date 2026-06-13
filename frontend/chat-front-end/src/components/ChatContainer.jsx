import { useEffect, useRef } from "react";
import NoChatSelected from "./NoChatSelected";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

const ChatMessage = ({ meId, msg }) => {
  const sender = msg?.senderId;
  const me = String(meId || "");
  const sid = typeof sender === "object" ? String(sender?._id || "") : String(sender || "");
  const isMine = me && sid && me === sid;

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className={`flex flex-col mb-4 ${isMine ? "items-end" : "items-start"}`}>
      <div
        className={[
          "inline-block w-fit",
          "max-w-[min(85ch,80%)]",
          "whitespace-pre-wrap break-words leading-relaxed",
          "px-5 py-3 shadow-sm",
          isMine 
            ? "bg-indigo-600 text-white rounded-[1.5rem] rounded-tr-sm" 
            : "bg-white text-slate-700 border border-slate-100 rounded-[1.5rem] rounded-tl-sm",
        ].join(" ")}
      >
        {msg?.text || ""}
        {msg?.image && (
          <img src={msg.image} alt="message" className="max-w-full rounded-xl mt-3 shadow-sm border border-black/5" />
        )}
      </div>
      <span className={`text-[11px] font-bold tracking-wide mt-1.5 px-2 ${isMine ? "text-indigo-400" : "text-slate-400"}`}>
        {formatTime(msg?.createdAt || msg?.updatedAt)}
      </span>
    </div>
  );
};

const MessagesList = ({ meId, messages }) => {
  const containerRef = useRef(null);

  // Auto-scroll to bottom whenever messages change without affecting window scroll
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
      {messages?.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-70">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
             <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
          </div>
          <span className="text-sm font-medium">No messages yet. Say hello!</span>
        </div>
      )}
      {messages?.map((m) => (
        <ChatMessage key={m._id || `${m.senderId}-${m.createdAt}`} meId={meId} msg={m} />
      ))}
    </div>
  );
};

const ChatContainer = ({ selectedUser, onThreadLoaded, onMessageSent }) => {
  const currentUser = useAuthStore((s) => s.authUser);
  const meId = currentUser?._id;

  // Use chat store for messages and real-time updates
  const messages = useChatStore((s) => s.messages);
  const isMessagesLoading = useChatStore((s) => s.isMessagesLoading);
  const getMessages = useChatStore((s) => s.getMessages);
  const setSelectedUser = useChatStore((s) => s.setSelectedUser);

  // When selectedUser changes, update the store and load messages
  useEffect(() => {
    if (selectedUser) {
      console.log("ChatContainer: Setting selected user:", selectedUser.fullName);
      setSelectedUser(selectedUser);
      getMessages(selectedUser._id);
    }
  }, [selectedUser?._id, setSelectedUser, getMessages]); // Fixed dependency array

  // Handle message sent callback
  const handleSent = (created) => {
    console.log("Message sent:", created);
    const when = created?.createdAt || created?.updatedAt || new Date().toISOString();
    onMessageSent?.(selectedUser?._id, when);
  };

  if (!selectedUser) return <NoChatSelected />;

  return (
    <section className="flex-1 flex flex-col h-full bg-slate-50/30 overflow-hidden">
      <ChatHeader selectedUser={selectedUser} />
      {isMessagesLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
           <span className="font-medium text-sm">Loading messages...</span>
        </div>
      ) : (
        <MessagesList meId={meId} messages={messages} />
      )}
      <MessageInput selectedUser={selectedUser} onSent={handleSent} meId={meId} />
    </section>
  );
};

export default ChatContainer;