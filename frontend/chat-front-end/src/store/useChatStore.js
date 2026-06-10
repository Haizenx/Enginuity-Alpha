// src/store/useChatStore.js
import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
      return Promise.resolve();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch messages");
      return Promise.reject(error);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    if (!selectedUser) {
      toast.error("No user selected");
      return;
    }
    
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set((state) => ({ 
        messages: [...state.messages, res.data],
        users: state.users.map(u => 
          u._id === selectedUser._id 
            ? { ...u, updatedAt: new Date().toISOString(), lastActivity: new Date().toISOString() } 
            : u
        )
      }));
    } catch (error) {
      console.error("Send message error:", error);
      toast.error(error.response?.data?.message || "Message failed to send");
    }
  },

  sendSystemMessage: async (messageData) => {
    try {
      const targetId = messageData.receiverId;
      const res = await axiosInstance.post(`/messages/send/${targetId}`, messageData);
      
      const { selectedUser } = get();
      if (selectedUser && selectedUser._id === targetId) {
        set((state) => ({ 
          messages: [...state.messages, res.data],
          users: state.users.map(u => 
            u._id === targetId 
              ? { ...u, updatedAt: new Date().toISOString(), lastActivity: new Date().toISOString() } 
              : u
          )
        }));
      } else {
        set((state) => ({ 
          users: state.users.map(u => 
            u._id === targetId 
              ? { ...u, updatedAt: new Date().toISOString(), lastActivity: new Date().toISOString() } 
              : u
          )
        }));
      }
    } catch (error) {
      console.error("System message error:", error);
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    
    console.log("🔍 Socket status:", {
      exists: !!socket,
      connected: socket?.connected,
      id: socket?.id
    });
    
    if (!socket) {
      console.log("❌ No socket available for message subscription");
      return;
    }

    console.log("📨 Subscribing to socket messages");

    // Remove any existing listeners to prevent duplicates
    socket.off("message:received");

    // Add the new message listener
    socket.on("message:received", (newMessage) => {
      console.log("🎯 SOCKET EVENT RECEIVED:", newMessage);
      
      const { selectedUser } = get();
      const { authUser } = useAuthStore.getState();
      
      console.log("📋 Checking relevance:", {
        selectedUserId: selectedUser?._id,
        authUserId: authUser?._id,
        messageSenderId: newMessage.senderId,
        messageReceiverId: newMessage.receiverId
      });
      
      // Add message if it's part of the current conversation
      const isRelevantMessage = selectedUser && (
        (newMessage.senderId === selectedUser._id && newMessage.receiverId === authUser._id) ||
        (newMessage.senderId === authUser._id && newMessage.receiverId === selectedUser._id)
      );

      const otherUserId = newMessage.senderId === authUser._id ? newMessage.receiverId : newMessage.senderId;

      if (isRelevantMessage) {
        console.log("✅ Adding message to current conversation");
        set((state) => ({
          messages: [...state.messages, newMessage],
          users: state.users.map(u => 
            u._id === otherUserId 
              ? { ...u, updatedAt: new Date().toISOString(), lastActivity: new Date().toISOString() }
              : u
          )
        }));
      } else {
        console.log("⚠️ Message not for current conversation");
        set((state) => ({
          users: state.users.map(u => 
            u._id === otherUserId 
              ? { ...u, updatedAt: new Date().toISOString(), lastActivity: new Date().toISOString() }
              : u
          )
        }));
        if (newMessage.senderId !== authUser._id) {
          toast.success("New message received!");
        }
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      console.log("📨 Unsubscribing from socket messages");
      socket.off("message:received");
    }
  },

  setSelectedUser: (selectedUser) => {
    console.log("👤 Setting selected user:", selectedUser?.fullName);
    console.log("🔌 Current socket connected:", useAuthStore.getState().socket?.connected);
    
    get().unsubscribeFromMessages();
    set({ selectedUser, messages: [] });
    
    setTimeout(() => {
      get().subscribeToMessages();
    }, 100);
  },

  // --- WebRTC / Video Call Signaling ---
  incomingCall: null, // { callerId, callerName, callerAvatar }
  callStatus: "idle", // 'idle', 'ringing', 'active'
  activeCall: null,   // { isCaller: boolean, targetUser: Object }
  
  setIncomingCall: (callData) => set({ incomingCall: callData, callStatus: "ringing" }),
  clearCall: () => set({ incomingCall: null, callStatus: "idle", activeCall: null }),
  setCallStatus: (status) => set({ callStatus: status }),
  setActiveCall: (callData) => set({ activeCall: callData, callStatus: "active" }),

  subscribeToCalls: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    
    socket.off("incomingCall");
    socket.off("callAccepted");
    socket.off("callRejected");
    socket.off("callEnded");

    socket.on("incomingCall", (callerData) => {
      get().setIncomingCall(callerData);
    });
    
    socket.on("callAccepted", () => {
      // Caller receives this when callee accepts
      get().setCallStatus("active");
    });
    
    socket.on("callRejected", () => {
      toast.error("Call declined");
      get().clearCall();
    });
    
    socket.on("callEnded", () => {
      get().clearCall();
    });
  },

  unsubscribeFromCalls: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("incomingCall");
      socket.off("callAccepted");
      socket.off("callRejected");
      socket.off("callEnded");
    }
  },
}));