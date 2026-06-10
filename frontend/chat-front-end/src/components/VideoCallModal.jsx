// src/components/VideoCallModal.jsx
import React, { useEffect, useState, useRef, useMemo } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { Phone, Mic, MicOff, Video, VideoOff, User, MonitorUp, MonitorX, Edit3, Sparkles } from 'lucide-react';
import Whiteboard from './Whiteboard';
import { useTranscription } from '../hooks/useTranscription';

import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { axiosInstance } from "../lib/axios";

const API_BASE = import.meta.env.VITE_BACKEND_URL || '';

const VideoCallModal = ({ currentUser, targetUser, isCaller, onClose }) => {
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenTrack, setScreenTrack] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callStartTime = useRef(null);

  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const { transcript, isTranscribing } = useTranscription(isJoined);
  const transcriptRef = useRef("");

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const client = useMemo(() => AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' }), []);
  const APP_ID = import.meta.env.VITE_AGORA_APP_ID;

  const pipStyle = { width: '176px', height: '240px' };

  // Main initialization effect
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        if (!APP_ID) throw new Error('Missing VITE_AGORA_APP_ID');

        const chRes = await axiosInstance.post(`/video/agora/channel`, { userA: currentUser._id, userB: targetUser._id });
        const channel = chRes.data.channel;
        if (!channel) throw new Error('No channel returned');

        const tokRes = await axiosInstance.post(`/video/agora/token`, { channel, uid: 0, role: 'publisher', expireSeconds: 3600 });
        const { token, appId } = tokRes.data;
        if (!token || !appId) throw new Error('Invalid token response');

        client.on('user-published', async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          if (mediaType === 'video' && remoteVideoRef.current) user.videoTrack?.play(remoteVideoRef.current);
          if (mediaType === 'audio') user.audioTrack?.play();
          if (mounted) setRemoteUsers(arr => [...arr.filter(u => u.uid !== user.uid), user]);
        });
        client.on('user-unpublished', (user, mediaType) => {
          if (mediaType === 'video' && mounted) setRemoteUsers(arr => arr.filter(u => u.uid !== user.uid));
        });
        client.on('user-left', (user) => {
          if (mounted) setRemoteUsers(arr => arr.filter(u => u.uid !== user.uid));
        });

        let mic = null;
        let cam = null;
        
        try {
          [mic, cam] = await AgoraRTC.createMicrophoneAndCameraTracks();
        } catch (mediaErr) {
          console.warn("Could not get both mic and cam, falling back...", mediaErr);
          try {
            mic = await AgoraRTC.createMicrophoneAudioTrack();
          } catch (e) {
            console.warn("No microphone available.");
          }
          try {
            cam = await AgoraRTC.createCameraVideoTrack();
          } catch (e) {
            console.warn("No camera available.");
          }
        }
        
        if (!mounted) return;

        if (mic) setLocalAudioTrack(mic);
        if (cam) setLocalVideoTrack(cam);
        
        if (!cam && mounted) setIsVideoEnabled(false);

        await client.join(APP_ID, channel, token, null);
        
        const tracksToPublish = [];
        if (mic) tracksToPublish.push(mic);
        if (cam) tracksToPublish.push(cam);
        
        if (tracksToPublish.length > 0) {
          await client.publish(tracksToPublish);
        }

        if (mounted) {
          setIsJoined(true);
          setIsLoading(false);
        }
      } catch (e) {
        console.error('Failed to initialize Agora:', e);
        if (mounted) {
          setError(e.message);
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
      (async () => {
        try {
          screenTrack?.stop(); screenTrack?.close();
          localAudioTrack?.stop(); localAudioTrack?.close();
          localVideoTrack?.stop(); localVideoTrack?.close();
          client.removeAllListeners();
          if (client.connectionState === 'CONNECTED') await client.leave();
        } catch (e) {
          console.error('Cleanup error:', e);
        }
      })();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, currentUser._id, targetUser._id]);

  useEffect(() => {
    return () => {
      if (isCaller) {
        if (callStartTime.current) {
          const durationMs = Date.now() - callStartTime.current;
          const mins = Math.floor(durationMs / 60000);
          const secs = Math.floor((durationMs % 60000) / 1000);
          const timeString = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
          useChatStore.getState().sendSystemMessage({
            text: `📞 Video call ended. Duration: ${timeString}`,
            receiverId: targetUser._id
          });

          // Trigger AI Summary if there was enough conversation
          const finalTranscript = transcriptRef.current;
          if (finalTranscript.length > 50) {
            axiosInstance.post('/gemini/summarize-call', { transcript: finalTranscript })
              .then(res => {
                useChatStore.getState().sendSystemMessage({
                  text: `✨ **AI Meeting Minutes**\n\n${res.data.summary}`,
                  receiverId: targetUser._id
                });
              })
              .catch(err => console.error("AI Summary failed", err));
          }
        } else {
          // They never joined
          useChatStore.getState().sendSystemMessage({
            text: `📞 Missed video call`,
            receiverId: targetUser._id
          });
        }
      }
    };
  }, [isCaller, targetUser._id]);

  useEffect(() => {
    // Only set start time once remote user joins so duration reflects actual talk time
    if (remoteUsers.length > 0 && !callStartTime.current) {
      callStartTime.current = Date.now();
    }
  }, [remoteUsers]);

  useEffect(() => {
    if (localVideoRef.current) {
      if (isScreenSharing && screenTrack) {
        screenTrack.play(localVideoRef.current);
      } else if (localVideoTrack) {
        localVideoTrack.play(localVideoRef.current);
      }
    }
    return () => {
      localVideoTrack?.stop();
      screenTrack?.stop();
    };
  }, [localVideoTrack, screenTrack, isScreenSharing]);

  const toggleMute = async () => {
    if (localAudioTrack) {
      const nextMuted = !isMuted;
      await localAudioTrack.setEnabled(!nextMuted);
      setIsMuted(nextMuted);
    }
  };

  const toggleVideo = async () => {
    if (localVideoTrack) {
      const nextEnabled = !isVideoEnabled;
      await localVideoTrack.setEnabled(nextEnabled);
      setIsVideoEnabled(nextEnabled);
    }
  };

  const stopScreenShare = async (trackToStop) => {
    if (trackToStop) {
      try {
        await client.unpublish(trackToStop);
        trackToStop.stop();
        trackToStop.close();
      } catch (e) {
        console.error("Error stopping screen track:", e);
      }
    }
    setScreenTrack(null);
    setIsScreenSharing(false);
    
    // Re-publish camera if video is enabled
    if (localVideoTrack && isVideoEnabled) {
      await client.publish(localVideoTrack);
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenVideoTrack = await AgoraRTC.createScreenVideoTrack({ encoderConfig: "1080p_1" }, "disable");
        
        screenVideoTrack.on("track-ended", async () => {
          await stopScreenShare(screenVideoTrack);
        });

        if (localVideoTrack) {
          await client.unpublish(localVideoTrack);
        }
        await client.publish(screenVideoTrack);
        
        setScreenTrack(screenVideoTrack);
        setIsScreenSharing(true);
      } else {
        await stopScreenShare(screenTrack);
      }
    } catch (e) {
      console.error("Screen sharing failed", e);
    }
  };
  
  const endCall = async () => {
    try {
      // 1. Notify other party via socket
      const socket = useAuthStore.getState().socket;
      if (socket) {
        socket.emit("call:end", { targetId: targetUser._id });
      }

      // 2. Cleanup Agora
      screenTrack?.stop(); screenTrack?.close();
      localAudioTrack?.stop(); localAudioTrack?.close();
      localVideoTrack?.stop(); localVideoTrack?.close();
      client.removeAllListeners();
      if (client.connectionState === 'CONNECTED') await client.leave();
    } catch (e) {
      console.error('Error ending call:', e);
    }
    onClose();
  };

  if (isLoading) { /* ... no changes here ... */ }
  if (error) { /* ... no changes here ... */ }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Remote */}
      <div className="flex-1 relative bg-gray-900 flex items-center justify-center">
        <div ref={remoteVideoRef} className="w-full h-full">
          {remoteUsers.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-white">
              <div className="w-32 h-32 rounded-full bg-primary flex items-center justify-center mb-6">
                <span className="text-5xl font-bold">
                  {targetUser?.fullName?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <p className="text-lg">Waiting for {targetUser?.fullName || 'user'} to join...</p>
            </div>
          )}
        </div>
      </div>

      {/* Local PiP */}
      {/* CHANGE: Added a placeholder for when video is disabled */}
      <div
        className="absolute top-20 right-4 border-2 border-white rounded-lg overflow-hidden shadow-2xl bg-gray-900 flex items-center justify-center"
        style={pipStyle}
      >
        <div ref={localVideoRef} className="w-full h-full" />
        {!isVideoEnabled && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur px-6 py-3 rounded-full z-50">
        <div className="flex items-center gap-4 text-white">
          <span className="font-medium">Call with {targetUser?.fullName || 'User'}</span>
          {isJoined && <span className="px-3 py-1 bg-green-500 rounded-full text-xs font-semibold uppercase">Connected</span>}
          {isTranscribing && (
            <span className="flex items-center gap-1 text-xs text-indigo-300 font-medium ml-2 border-l border-white/20 pl-4">
              <Sparkles className="w-3 h-3" /> AI Minutes
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 bg-black/50 backdrop-blur px-6 py-4 rounded-full z-50">
        <button onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-white/20 hover:bg-white/30'}`}>
          {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
        </button>
        <button onClick={toggleVideo}
                disabled={isScreenSharing || showWhiteboard}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${(isScreenSharing || showWhiteboard) ? 'bg-gray-600 opacity-50 cursor-not-allowed' : (!isVideoEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-white/20 hover:bg-white/30')}`}>
          {isVideoEnabled ? <Video className="w-6 h-6 text-white" /> : <VideoOff className="w-6 h-6 text-white" />}
        </button>
        <button onClick={toggleScreenShare}
                disabled={showWhiteboard}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${showWhiteboard ? 'bg-gray-600 opacity-50 cursor-not-allowed' : (isScreenSharing ? 'bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/50' : 'bg-white/20 hover:bg-white/30')}`}>
          {isScreenSharing ? <MonitorX className="w-6 h-6 text-white" /> : <MonitorUp className="w-6 h-6 text-white" />}
        </button>
        <button onClick={() => setShowWhiteboard(!showWhiteboard)}
                disabled={isScreenSharing}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isScreenSharing ? 'bg-gray-600 opacity-50 cursor-not-allowed' : (showWhiteboard ? 'bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/50' : 'bg-white/20 hover:bg-white/30')}`}
                title="Whiteboard Collab">
          <Edit3 className="w-6 h-6 text-white" />
        </button>
        <button onClick={endCall}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-all">
          <Phone className="w-6 h-6 text-white rotate-135" />
        </button>
      </div>

      {showWhiteboard && <Whiteboard targetUserId={targetUser._id} onClose={() => setShowWhiteboard(false)} />}
    </div>
  );
};

export default VideoCallModal;