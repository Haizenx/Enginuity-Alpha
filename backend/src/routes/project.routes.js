import express from "express";
import mongoose from "mongoose";
import upload, { uploadCoverPhoto as coverMulter } from "../middleware/upload.js";
import axios from "axios";
import Project from "../models/project.model.js"; // ensure Project is imported
import {
  createProject,
  getProjects,
  getProjectById,
  assignProjectManager,
  updateProjectStatus,
  addProjectManagers,
  removeProjectManagers,
  addActivity,
  updateActivity,
  deleteActivity,
  addEmployee,
  deleteEmployee,
  uploadDocument,
  deleteDocument,
  uploadCoverPhoto,
} from "../controllers/project.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Base
router.get("/", protectRoute, getProjects);
router.post("/", protectRoute, createProject);

// Single project with populated client.fullName
router.get("/:projectId", protectRoute, getProjectById);

// Project actions
router.put("/:projectId/assign-pm", protectRoute, assignProjectManager);
router.put("/:projectId/update-status", protectRoute, updateProjectStatus);
router.put("/:projectId/add-pms", protectRoute, addProjectManagers);
router.put("/:projectId/remove-pms", protectRoute, removeProjectManagers);

// Activities
router.post("/:projectId/activities", protectRoute, addActivity);
router.patch("/:projectId/activities/:activityId", protectRoute, updateActivity);
router.delete("/:projectId/activities/:activityId", protectRoute, deleteActivity);

// Employees
router.post("/:projectId/employees", protectRoute, addEmployee);
router.delete("/:projectId/employees/:employeeId", protectRoute, deleteEmployee);

// Documents
router.post("/:projectId/documents", protectRoute, upload.single("file"), uploadDocument);
router.delete("/:projectId/documents/:docId", protectRoute, deleteDocument);

// VIEW route: redirect to a browser-viewable URL
router.get("/:projectId/documents/:docId/view", protectRoute, async (req, res) => {
  try {
    const { projectId, docId } = req.params;
    const project = await Project.findById(projectId).lean();
    if (!project) return res.status(404).json({ message: "Project not found" });

    const doc = project.documents?.find((d) => d._id.toString() === docId);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    // Simply redirect the browser to the document's original URL.
    return res.redirect(doc.url);
  } catch (err) {
    console.error("Error viewing document:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Download proxy (single)
router.get("/:projectId/documents/:docId/download", protectRoute, async (req, res) => {
  try {
    const { projectId, docId } = req.params;
    const project = await Project.findById(projectId).lean();
    if (!project) return res.status(404).json({ message: "Project not found" });

    const doc = project.documents?.find((d) => d._id.toString() === docId);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const response = await axios.get(doc.url, { responseType: "arraybuffer" });
    res.setHeader("Content-Disposition", `attachment; filename="${doc.name || "document"}"`);
    res.setHeader("Content-Type", response.headers["content-type"] || "application/octet-stream");
    return res.send(response.data);
  } catch (err) {
    console.error("Error downloading document:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Cover photo
router.post("/:projectId/cover-photo", protectRoute, coverMulter.single("file"), uploadCoverPhoto);

export default router;
