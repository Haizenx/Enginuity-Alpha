// src/components/VideoCallModal.jsx
import React, { useEffect, useState, useRef, useMemo } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { Phone, Mic, MicOff, Video, VideoOff, User } from 'lucide-react'; // CHANGE: Imported User icon

const API_BASE = import.meta.env.VITE_BACKEND_URL || '';

const VideoCallModal = ({ currentUser, targetUser, onClose }) => {
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const client = useMemo(() => AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' }), []);
  const APP_ID = import.meta.env.VITE_AGORA_APP_ID;

  const pipStyle = { width: '176px', height: '240px' };

  // Main initialization effect
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        if (!APP_ID) throw new Error('Missing VITE_AGORA_APP_ID');

        const chRes = await fetch(`${API_BASE}/api/video/agora/channel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userA: currentUser._id, userB: targetUser._id })
        });
        const { channel } = await chRes.json();
        if (!channel) throw new Error('No channel returned');

        const tokRes = await fetch(`${API_BASE}/api/video/agora/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel, uid: 0, role: 'publisher', expireSeconds: 3600 })
        });
        const { token, appId } = await tokRes.json();
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

        const [mic, cam] = await AgoraRTC.createMicrophoneAndCameraTracks();
        if (!mounted) return;

        setLocalAudioTrack(mic);
        setLocalVideoTrack(cam);

        await client.join(APP_ID, channel, token, null);
        await client.publish([mic, cam]);

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
  }, [client, currentUser._id, targetUser._id]); // CHANGE: Simplified dependencies

  // CHANGE: This new effect is now the single source of truth for playing the local video.
  useEffect(() => {
    if (localVideoTrack && localVideoRef.current) {
      localVideoTrack.play(localVideoRef.current);
    }
    return () => {
      // Stop the track when the component unmounts or the track changes
      localVideoTrack?.stop();
    };
  }, [localVideoTrack]);


  // CHANGE: Removed the two useEffects that handled video toggling and resizing,
  // as they are no longer needed. Agora's `setEnabled` handles rendering state.

  const toggleMute = async () => {
    if (localAudioTrack) {
      const nextMuted = !isMuted;
      await localAudioTrack.setEnabled(!nextMuted);
      setIsMuted(nextMuted);
    }
  };

  // CHANGE: Simplified the video toggle function
  const toggleVideo = async () => {
    if (localVideoTrack) {
      const nextEnabled = !isVideoEnabled;
      await localVideoTrack.setEnabled(nextEnabled);
      setIsVideoEnabled(nextEnabled);
    }
  };
  
  const endCall = async () => {
    try {
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
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur px-6 py-3 rounded-full">
        <div className="flex items-center gap-4 text-white">
          <span className="font-medium">Call with {targetUser?.fullName || 'User'}</span>
          {isJoined && <span className="px-3 py-1 bg-green-500 rounded-full text-xs font-semibold uppercase">Connected</span>}
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 bg-black/50 backdrop-blur px-6 py-4 rounded-full">
        <button onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-white/20 hover:bg-white/30'}`}>
          {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
        </button>
        <button onClick={toggleVideo}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${!isVideoEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-white/20 hover:bg-white/30'}`}>
          {isVideoEnabled ? <Video className="w-6 h-6 text-white" /> : <VideoOff className="w-6 h-6 text-white" />}
        </button>
        <button onClick={endCall}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-all">
          <Phone className="w-6 h-6 text-white rotate-135" />
        </button>
      </div>
    </div>
  );
};

export default VideoCallModal;