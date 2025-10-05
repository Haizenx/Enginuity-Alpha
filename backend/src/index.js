import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";

import { connectDB } from "./lib/db.js";
import createSuperAdmin from "./lib/createSuperAdmin.js";
import { initSocketServer } from "./lib/socket.js";

// Routes
import authRoutes from "./routes/auth.route.js";
import adminRoutes from "./routes/admin.routes.js";
import userRoutes from "./routes/user.routes.js";
import messageRoutes from "./routes/message.routes.js";
import projectRoutes from "./routes/project.routes.js";
import quotationRoutes from "./routes/quotation.routes.js";
import itemRoutes from "./routes/item.routes.js";
import payrollRecordRoutes from "./routes/payrollRecord.routes.js";
import payrollRoutes from "./routes/payroll.routes.js";
import projectManagerRoutes from "./routes/projectManager.routes.js";
import devRoutes from "./routes/dev.routes.js";
import supplierRoutes from "./routes/supplier.routes.js";
import cloudConvertRoutes from "./routes/cloudConvert.routes.js";
import videoRoutes from "./routes/videos.routes.js";


dotenv.config();

const PORT = process.env.PORT || 5001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Core middleware
app.use(express.json({ limit: "2mb" })); // parses JSON bodies
app.use(cookieParser());

// CORS with credentials
const allowedOrigins = [
  "http://localhost:5173",
  "https://enguinity-9.onrender.com",
  "http://10.0.2.2:8081",
  "https://enginuity-alpha-1.onrender.com" 
];
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true); // allow server-to-server/local tools
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS: origin not allowed"), false);
    },
    credentials: true, // allow cookies for JWT auth
  })
);

// Health check
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Static uploads (for any files you store locally)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// API Routes
app.use("/api/auth", authRoutes);         // login, forgot, self password change
app.use("/api/admin", adminRoutes);       // reset requests + accounts CRUD
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/payroll-records", payrollRecordRoutes);
app.use("/api/payrolls", payrollRoutes);
app.use("/api/pm", projectManagerRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/cloudconvert", cloudConvertRoutes);
app.use('/api/video', videoRoutes);




// Dev route (remove in production)
app.use("/api/dev", devRoutes);

// 404 JSON (place after all routes)
app.use((req, res, next) => {
  return res.status(404).json({ message: "Not Found" });
});

// Global error handler (must be last)
app.use((err, req, res, next) => {
  // Identify Multer errors explicitly so uploads return 4xx instead of generic 500
  const isMulter = err && err.name === "MulterError";
  const status = err?.status || (isMulter ? 400 : 500);

  // Optional: normalize some common CORS/multipart errors
  // if (err.message?.includes("CORS")) status = 403;

  return res.status(status).json({
    message: isMulter ? `Upload error: ${err.code}` : err.message || "Server error",
    details: process.env.NODE_ENV !== "production" ? err : undefined,
  });
});

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
  const frontendDistPath = path.join(__dirname, "../frontend/chat-front-end/dist");
  app.use(express.static(frontendDistPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

// Startup
const startServer = async () => {
  try {
    await connectDB();
    await createSuperAdmin();
    console.log("✅ Superadmin check/creation complete");

    initSocketServer(server, allowedOrigins);

    server.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Error during server startup:", err.message);
    process.exit(1);
  }
};

startServer();
