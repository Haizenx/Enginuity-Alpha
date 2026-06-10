// lib/axios.js
import axios from "axios";

// Resolve base URL; default to local dev backend
const RAW_BASE = import.meta.env?.VITE_BACKEND_URL || "http://localhost:5001";
// Normalize to avoid trailing slashes and then append /api
const API_BASE_URL = `${String(RAW_BASE).replace(/\/+$/, "")}/api`;

// Create an Axios instance that always sends cookies (HttpOnly token)
export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // required for cookie-based auth
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request interceptor: attach token from localStorage if available
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("enginuity_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Centralized endpoints (optional, for consistency)
export const API_ENDPOINTS = {
  AUTH: "/auth",
  USERS: "/users",
  PROJECTS: "/projects",
  DOCUMENTS: "/documents",
  ACTIVITIES: "/activities",
  MESSAGES: "/messages",
};

// Convenience helpers for password updates
export const updateUserPassword = (currentPassword, newPassword, confirmNewPassword) =>
  axiosInstance.put("/auth/password", { currentPassword, newPassword, confirmNewPassword });

export const updateSuperAdminPassword = (newPassword, confirmNewPassword) =>
  axiosInstance.put("/auth/superadmin/password", { newPassword, confirmNewPassword });

// Optional: emit a browser event so the app shell can clear state on 401
function emitUnauthorized() {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("auth:unauthorized"));
    }
  } catch {
    // no-op
  }
}

// Response interceptor: log errors, clear client state on 401, and redirect
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;
    // Lightweight logging for debugging
    // eslint-disable-next-line no-console
    console.error("API Error:", { status, data });

    if (status === 401) {
      // Notify app to clear any local auth state (e.g., stores, caches)
      emitUnauthorized();

      // Avoid redirect loop if already on /login
      if (typeof window !== "undefined") {
        const isOnLogin = window.location.pathname.startsWith("/login");
        if (!isOnLogin) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
