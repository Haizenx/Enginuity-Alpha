// src/components/ChatHeader.jsx
import { useState } from "react";
import { X, Video } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import VideoCallModal from "./VideoCallModal";

const ChatHeader = ({ selectedUser, onClose }) => {
  const [showVideoModal, setShowVideoModal] = useState(false);
  const user = selectedUser || {};
  const currentUser = useAuthStore((s) => s.authUser);
  const onlineUsers = useAuthStore((s) => s.onlineUsers);
  
  // Check if user is online
  const isOnline = onlineUsers.includes(user?._id);
  
  const handleStartVideo = () => {
    if (!user?._id || !currentUser?._id) {
      console.error('Missing user data for video call');
      return;
    }
    
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.emit("call:initiate", {
        receiverId: user._id,
        callerData: {
          callerId: currentUser._id,
          callerName: currentUser.fullName,
          callerAvatar: currentUser.profilePic
        }
      });
      
      // Set active call so App.jsx renders VideoCallModal
      import("../store/useChatStore").then(module => {
        module.useChatStore.getState().setActiveCall({
          isCaller: true,
          targetUser: user
        });
      });
    }
  };

  return (
    <>
      <div className="px-8 py-5 border-b border-slate-100 bg-white/50 backdrop-blur-md z-10 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <img 
                className="w-12 h-12 rounded-full object-cover shadow-sm ring-2 ring-white group-hover:scale-105 transition-transform" 
                src={user?.profilePic || "/avatar.png"} 
                alt={user?.fullName || "User"} 
              />
              {/* Online status indicator */}
              {isOnline && (
                <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm"></span>
              )}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight leading-tight">{user?.fullName || "User"}</h3>
              <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                {isOnline ? (
                  <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Active now</>
                ) : (
                  <><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>Offline</>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleStartVideo}
              className="w-10 h-10 flex items-center justify-center text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-full transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
              aria-label="Start video call"
              title="Start video call"
            >
              <Video className="w-5 h-5" />
            </button>
            <button
              onClick={() => onClose?.()}
              className="w-10 h-10 flex items-center justify-center text-slate-400 bg-slate-50 hover:bg-rose-500 hover:text-white rounded-full transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
              aria-label="Close chat"
              title="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatHeader;