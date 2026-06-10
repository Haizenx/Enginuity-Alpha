import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";
import { io } from "socket.io-client";

const API_AND_SOCKET_BASE_URL = import.meta.env.VITE_BACKEND_URL;

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  // Update profile: supports multipart avatar and JSON field updates
  updateProfile: async (updates) => {
    const { authUser } = get();
    if (!authUser) {
      toast.error("Not authenticated");
      return;
    }

    // Accept one or two files: { file } or { file, coverFile }
    const hasFile = !!updates?.file;
    const hasCover = !!updates?.coverFile;
    const isMultipart = hasFile || hasCover;

    try {
      set({ isUpdatingProfile: true });

      let res;

      if (isMultipart) {
        // If backend updated to upload.fields for two files, send both.
        // Otherwise, fallback to separate requests (see below).
        const fd = new FormData();

        if (hasFile) {
          // MUST match backend field name
          fd.append("profilePic", updates.file);
        }
        if (hasCover) {
          // Backend must accept a second field (e.g., coverPhoto) via upload.fields
          fd.append("coverPhoto", updates.coverFile);
        }

        res = await axiosInstance.put("/users/profile/picture", fd, {
          // Let Axios infer boundary from FormData; header optional
          // headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        });
      } else {
        // JSON-only profile updates
        const body = {};
        if (updates?.fullName) body.fullName = updates.fullName;
        if (updates?.name) body.name = updates.name;
        if (updates?.email) body.email = updates.email;
        if (updates?.phone) body.phone = updates.phone;
        if (updates?.bio) body.bio = updates.bio;
        if (updates?.profilePic) body.profilePic = updates.profilePic;

        res = await axiosInstance.put("/users/profile", body, {
          withCredentials: true,
        });
      }

      // Merge updated data into authUser
      const updated = res?.data?.user ?? res?.data ?? {};
      const current = get().authUser || {};
      const merged = { ...current, ...updated };

      // Ensure profilePic updated from direct avatar response
      if (isMultipart && res?.data?.profilePic) {
        merged.profilePic = res.data.profilePic;
      }
      // Optionally pick up coverPhoto URL if backend returns it
      if (isMultipart && res?.data?.coverPhoto) {
        merged.coverPhoto = res.data.coverPhoto;
      }

      set({ authUser: merged });
      toast.success("Profile updated successfully");
    } catch (err) {
      console.error("Profile update failed:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Profile update failed";
      toast.error(msg);
      throw err;
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      localStorage.removeItem("enginuity_token");
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      if (res.data?.token) localStorage.setItem("enginuity_token", res.data.token);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Signup failed");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      if (res.data?.token) localStorage.setItem("enginuity_token", res.data.token);
      set({ authUser: res.data });
      toast.success("Logged in successfully");
      get().connectSocket();
      return res.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Login failed";
      toast.error(errorMessage);
      throw error;
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      localStorage.removeItem("enginuity_token");
      set({ authUser: null });
      get().disconnectSocket();
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      localStorage.removeItem("enginuity_token");
      set({ authUser: null });
      get().disconnectSocket();
    }
  },

  connectSocket: () => {
    const { authUser, socket } = get();
    if (!authUser || socket?.connected) return;
  
    // Disconnect old socket if exists
    if (socket) {
      socket.disconnect();
    }
  
    // Get JWT token from localStorage fallback to cookie
    let token = localStorage.getItem("enginuity_token");
    if (!token) {
      token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];
    }
  
    console.log("Connecting socket with token:", !!token);
  
    const newSocket = io(API_AND_SOCKET_BASE_URL, {
      withCredentials: true,
      auth: {
        token: token  // Send token in auth (backend expects this)
      },
      query: { 
        userId: authUser._id  // Fallback for backend
      }
    });
  
    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id, "user:", authUser._id);
      set({ socket: newSocket });
    });
  
    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
    });
  
    newSocket.on("getOnlineUsers", (users) => {
      set({ onlineUsers: users });
    });
  
    newSocket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });
  
    set({ socket: newSocket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, onlineUsers: [] });
    }
  },
}));