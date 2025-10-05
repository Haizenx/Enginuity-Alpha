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
    setShowVideoModal(true);
  };

  return (
    <>
      <div className="p-2.5 border-b border-base-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="avatar relative">
              <div className="size-10 rounded-full">
                <img src={user?.profilePic || "/avatar.png"} alt={user?.fullName || "User"} />
              </div>
              {/* Online status indicator */}
              {isOnline && (
                <span className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-white rounded-full"></span>
              )}
            </div>
            <div>
              <h3 className="font-medium">{user?.fullName || "User"}</h3>
              <p className="text-sm text-base-content/70">
                {isOnline ? "Online" : "Offline"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartVideo}
              className="p-2 hover:bg-base-200 rounded-md transition"
              aria-label="Start video call"
              title="Start video call"
            >
              <Video className="size-5" />
            </button>
            <button
              onClick={() => onClose?.()}
              className="p-2 hover:bg-base-200 rounded-md transition"
              aria-label="Close chat"
              title="Close chat"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Video Call Modal */}
      {showVideoModal && currentUser && (
        <VideoCallModal
          currentUser={currentUser}
          targetUser={user}
          onClose={() => setShowVideoModal(false)}
        />
      )}
    </>
  );
};

export default ChatHeader;