import { Server } from "socket.io";
import jwt from "jsonwebtoken";

// Global references
let io;
// userId -> Set<socketId> (multi-tabs/devices)
const userSockets = new Map();

function addUserSocket(userId, socketId) {
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId).add(socketId);
}

function removeUserSocket(userId, socketId) {
  const set = userSockets.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) userSockets.delete(userId);
}

function allOnlineUserIds() {
  return Array.from(userSockets.keys());
}

// ⭐ MODIFIED: Enhanced token extraction for mobile support
function authenticateSocket(socket) {
  try {
    // Priority 1: Check socket handshake auth.token (mobile preferred)
    let token = socket.handshake?.auth?.token;
    
    // Priority 2: Check query params (fallback)
    if (!token) {
      token = socket.handshake?.query?.token;
    }
    
    // Priority 3: Check cookie (web)
    if (!token) {
      token = socket.handshake?.headers?.cookie?.match(/token=([^;]+)/)?.[1];
    }
    
    if (!token) {
      console.log("⚠️ Socket connection without token");
      return null;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded?.userId || decoded?.id;
    
    console.log("✅ Socket authenticated:", userId, "platform:", decoded?.platform || "unknown");
    
    return userId ? String(userId) : null;
  } catch (error) {
    console.error("❌ Socket auth failed:", error.message);
    return null;
  }
}

export function initSocketServer(httpServer, allowedOrigins) {
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    const jwtUserId = authenticateSocket(socket);
    const queryUserId = socket.handshake?.query?.userId;
    const userId =
      jwtUserId ||
      (queryUserId && String(queryUserId) !== "undefined" ? String(queryUserId) : null);

    if (userId) {
      addUserSocket(userId, socket.id);
      socket.join(userId);
      console.log("🔌 Socket connected -> user:", userId, "socket:", socket.id);
    } else {
      console.log("⚠️ Socket connected without authentication");
    }

    io.emit("getOnlineUsers", allOnlineUserIds());

    socket.on("disconnect", () => {
      if (userId) {
        removeUserSocket(userId, socket.id);
        console.log("🔌 Socket disconnected -> user:", userId, "socket:", socket.id);
      }
      io.emit("getOnlineUsers", allOnlineUserIds());
    });

    // Optional relay if clients send messages via socket transport
    socket.on("chatMessage", (payload) => {
      const to = String(payload?.receiverId || "");
      if (!to) return;
      io.to(to).emit("message:received", payload);
    });

    // --- WebRTC / Video Call Signaling ---
    
    socket.on("call:initiate", (payload) => {
      // payload: { receiverId, callerData }
      const to = String(payload?.receiverId || "");
      if (!to) return;
      io.to(to).emit("incomingCall", payload.callerData);
    });

    socket.on("call:accept", (payload) => {
      // payload: { callerId }
      const to = String(payload?.callerId || "");
      if (!to) return;
      io.to(to).emit("callAccepted");
    });

    socket.on("call:reject", (payload) => {
      // payload: { callerId }
      const to = String(payload?.callerId || "");
      if (!to) return;
      io.to(to).emit("callRejected");
    });

    socket.on("call:end", (payload) => {
      // payload: { targetId }
      const to = String(payload?.targetId || "");
      if (!to) return;
      io.to(to).emit("callEnded");
    });
  });
}

// Emit to all sockets of a specific user
export function emitToUser(userId, event, data) {
  if (!io || !userId) return;
  const payloadReceiver = String(
    typeof data?.receiverId === "object" ? data.receiverId?._id : data?.receiverId || ""
  );
  console.log("📤 EMIT ->", event, "to user:", String(userId), "payload.receiverId:", payloadReceiver);
  io.to(String(userId)).emit(event, data);
}

// Legacy helper (single socket id)
export function getReceiverSocketId(userId) {
  const set = userSockets.get(String(userId));
  if (!set || set.size === 0) return undefined;
  return Array.from(set)[0];
}

export { io };