import React, { useEffect, useRef } from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";

const IncomingCallModal = ({ onAccept }) => {
  const { incomingCall, clearCall, callStatus } = useChatStore();
  const { socket } = useAuthStore();
  const audioRef = useRef(null);

  useEffect(() => {
    if (callStatus === "ringing" && incomingCall) {
      if (audioRef.current) {
        audioRef.current.loop = true;
        audioRef.current.play().catch(e => console.log("Audio play prevented:", e));
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [callStatus, incomingCall]);

  if (!incomingCall || callStatus !== "ringing") return null;

  const handleAccept = () => {
    socket.emit("call:accept", { callerId: incomingCall.callerId });
    if (audioRef.current) audioRef.current.pause();
    
    // Set active call so App.jsx renders VideoCallModal
    useChatStore.getState().setActiveCall({
      isCaller: false,
      targetUser: {
        _id: incomingCall.callerId,
        fullName: incomingCall.callerName,
        profilePic: incomingCall.callerAvatar
      }
    });
    
    if (onAccept) onAccept();
  };

  const handleDecline = () => {
    socket.emit("call:reject", { callerId: incomingCall.callerId });
    clearCall();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Hidden audio element for ringing sound */}
      <audio ref={audioRef} src="/sounds/ringtone.mp3" preload="auto" />
      
      <div className="bg-base-100 w-full max-w-sm rounded-3xl p-8 flex flex-col items-center shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary relative z-10">
            <img 
              src={incomingCall.callerAvatar || "/avatar.png"} 
              alt={incomingCall.callerName}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-base-content mb-2">{incomingCall.callerName}</h2>
        <p className="text-base-content/60 mb-8 flex items-center gap-2">
          <Video className="w-4 h-4 animate-pulse" />
          Incoming video call...
        </p>
        
        <div className="flex gap-6 w-full justify-center">
          <button 
            onClick={handleDecline}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-transform hover:scale-110 shadow-lg shadow-red-500/30"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
          
          <button 
            onClick={handleAccept}
            className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white transition-transform hover:scale-110 shadow-lg shadow-green-500/30 animate-bounce"
          >
            <Phone className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
