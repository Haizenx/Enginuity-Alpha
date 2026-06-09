// controllers/project.controller.js
import mongoose from "mongoose";
import User from "../models/user.model.js";
import Project from "../models/project.model.js";

/* -------------------------- helpers / population -------------------------- */

const populateProject = (query) =>
  query
    .populate("projectManager", "fullName contactNumber")
    .populate("projectExtras", "fullName contactNumber")
    .populate("client", "fullName email contactNumber")
    .lean();

/* -------------------------------- projects -------------------------------- */

export const createProject = async (req, res) => {
  try {
    const {
      clientId,
      projectManagerId,
      description,
      location,
      contactNumber,
      startDate,
      targetDeadline,
      clientName,
      imageUrl,
      budget,
    } = req.body;

    const client = await User.findOne({ _id: clientId, role: "client" });
    if (!client) return res.status(404).json({ message: "Client not found" });

    let pmId = null;
    if (projectManagerId) {
      const pm = await User.findOne({ _id: projectManagerId, role: "project_manager" });
      if (!pm) return res.status(404).json({ message: "Project Manager not found" });
      pmId = pm._id;
    }

    const project = await Project.create({
      client: client._id,
      projectManager: pmId,
      description,
      location,
      contactNumber,
      startDate,
      targetDeadline,
      clientName,
      imageUrl,
      budget,
    });

    const populated = await populateProject(Project.findById(project._id));
    return res.status(201).json(populated);
  } catch (error) {
    console.error("Error creating project:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getProjects = async (req, res) => {
  try {
    const { assignedTo, clientId, status } = req.query;
    const filter = {};

    if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) {
      filter.$or = [
        { projectManager: new mongoose.Types.ObjectId(assignedTo) },
        { projectExtras: new mongoose.Types.ObjectId(assignedTo) },
      ];
    }

    if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
      filter.client = new mongoose.Types.ObjectId(clientId);
    }
    if (status) filter.status = status;

    if (!assignedTo && req.user && req.user.role === "project_manager") {
      filter.$or = [{ projectManager: req.user._id }, { projectExtras: req.user._id }];
    }
    if (!clientId && req.user && req.user.role === "client") {
      filter.client = req.user._id;
    }

    const projects = await populateProject(Project.find(filter));
    
    // Filter out projects with null/undefined client references (orphaned projects)
    const validProjects = projects.filter(p => p.client !== null && p.client !== undefined);
    
    return res.json(validProjects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Invalid project id" });
    }

    const project = await populateProject(Project.findById(projectId));
    if (!project) return res.status(404).json({ message: "Project not found" });
    
    // Check if client reference is valid
    if (!project.client) {
      return res.status(404).json({ message: "Project has invalid client reference" });
    }

    // ensure progress present (backend or derived)
    if (Array.isArray(project.activities) && project.activities.length > 0) {
      const completed = project.activities.filter((a) => a.status === "completed").length;
      project.progress = Math.round((completed / project.activities.length) * 100);
    } else {
      project.progress = 0;
    }

    return res.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// ... rest of your controller functions remain the same
export const assignProjectManager = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { projectManagerId } = req.body;

    const manager = await User.findOne({ _id: projectManagerId, role: "project_manager" });
    if (!manager) return res.status(404).json({ message: "Project Manager not found" });

    const project = await populateProject(
      Project.findByIdAndUpdate(projectId, { projectManager: manager._id }, { new: true })
    );

    if (!project) return res.status(404).json({ message: "Project not found" });
    return res.json(project);
  } catch (error) {
    console.error("Error assigning project manager:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProjectStatus = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status } = req.body;

    const project = await populateProject(
      Project.findByIdAndUpdate(projectId, { status }, { new: true })
    );

    if (!project) return res.status(404).json({ message: "Project not found" });
    return res.json(project);
  } catch (error) {
    console.error("Error updating project status:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const addProjectManagers = async (req, res) => {
  try {
    const { projectId } = req.params;
    let { managerIds } = req.body;

    if (!managerIds) return res.status(400).json({ message: "managerIds required" });
    if (!Array.isArray(managerIds)) managerIds = [managerIds];

    const validIds = managerIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length !== managerIds.length) {
      return res.status(400).json({ message: "Invalid manager id(s) detected" });
    }

    const foundCount = await User.countDocuments({
      _id: { $in: validIds },
      role: "project_manager",
    });
    if (foundCount !== validIds.length) {
      return res.status(404).json({ message: "One or more managers not found" });
    }

    const updated = await populateProject(
      Project.findByIdAndUpdate(
        projectId,
        { $addToSet: { projectExtras: { $each: validIds } } },
        { new: true }
      )
    );

    if (!updated) return res.status(404).json({ message: "Project not found" });
    return res.json(updated);
  } catch (error) {
    console.error("Error adding project managers:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const removeProjectManagers = async (req, res) => {
  try {
    const { projectId } = req.params;
    let { managerIds } = req.body;

    if (!managerIds) return res.status(400).json({ message: "managerIds required" });
    if (!Array.isArray(managerIds)) managerIds = [managerIds];

    const validIds = managerIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length !== managerIds.length) {
      return res.status(400).json({ message: "Invalid manager id(s) detected" });
    }

    const updated = await populateProject(
      Project.findByIdAndUpdate(
        projectId,
        { $pullAll: { projectExtras: validIds } },
        { new: true }
      )
    );

    if (!updated) return res.status(404).json({ message: "Project not found" });
    return res.json(updated);
  } catch (error) {
    console.error("Error removing project managers:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const addActivity = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, startDate, dueDate, status } = req.body;

    const update = {
      $push: {
        activities: {
          name,
          description,
          startDate,
          dueDate,
          status: status || "pending",
        },
      },
    };

    const updated = await populateProject(
      Project.findByIdAndUpdate(projectId, update, { new: true })
    );

    if (!updated) return res.status(404).json({ message: "Project not found" });
    return res.status(201).json(updated);
  } catch (error) {
    console.error("Error adding activity:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateActivity = async (req, res) => {
  try {
    const { projectId, activityId } = req.params;
    const updates = req.body;

    const project = await Project.findOneAndUpdate(
      { _id: projectId, "activities._id": activityId },
      {
        $set: Object.fromEntries(
          Object.entries(updates).map(([k, v]) => [`activities.$.${k}`, v])
        ),
      },
      { new: true }
    );

    if (!project) return res.status(404).json({ message: "Activity or project not found" });

    const populated = await populateProject(Project.findById(project._id));
    return res.json(populated);
  } catch (error) {
    console.error("Error updating activity:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteActivity = async (req, res) => {
  try {
    const { projectId, activityId } = req.params;

    const updated = await populateProject(
      Project.findByIdAndUpdate(
        projectId,
        { $pull: { activities: { _id: activityId } } },
        { new: true }
      )
    );

    if (!updated) return res.status(404).json({ message: "Project not found" });
    return res.json(updated);
  } catch (error) {
    console.error("Error deleting activity:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const addEmployee = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, role, wagePerDay, startDate, dueDate } = req.body;

    const updated = await populateProject(
      Project.findByIdAndUpdate(
        projectId,
        { $push: { employees: { name, role, wagePerDay, startDate, dueDate } } },
        { new: true }
      )
    );

    if (!updated) return res.status(404).json({ message: "Project not found" });
    return res.status(201).json(updated);
  } catch (error) {
    console.error("Error adding employee:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const { projectId, employeeId } = req.params;

    const updated = await populateProject(
      Project.findByIdAndUpdate(
        projectId,
        { $pull: { employees: { _id: employeeId } } },
        { new: true }
      )
    );

    if (!updated) return res.status(404).json({ message: "Project not found" });
    return res.json(updated);
  } catch (error) {
    console.error("Error deleting employee:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const uploadDocument = async (req, res) => {
  try {
    const { projectId } = req.params;
    const f = req.file || {};
    const { url: bodyUrl, name } = req.body;

    const fileUrl = bodyUrl || f.path || f.secure_url || f.url;
    const displayName = name || f.originalname || f.filename || "Document";

    if (!fileUrl) {
      console.error("Upload error: missing file URL. file=", f);
      return res.status(400).json({ message: "Missing document URL" });
    }

    const newDoc = { name: displayName, url: fileUrl, uploadedAt: new Date() };

    const updated = await Project.findByIdAndUpdate(
      projectId,
      { $push: { documents: newDoc } },
      { new: true }
    )
      .populate("projectManager", "fullName contactNumber")
      .populate("projectExtras", "fullName contactNumber")
      .populate("client", "fullName email contactNumber")
      .lean();

    if (!updated) return res.status(404).json({ message: "Project not found" });
    return res.status(201).json(updated);
  } catch (error) {
    console.error("Error uploading document:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error?.message });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const { projectId, docId } = req.params;

    const updated = await populateProject(
      Project.findByIdAndUpdate(
        projectId,
        { $pull: { documents: { _id: docId } } },
        { new: true }
      )
    );

    if (!updated) return res.status(404).json({ message: "Project not found" });
    return res.json(updated);
  } catch (error) {
    console.error("Error deleting document:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const uploadCoverPhoto = async (req, res) => {
  try {
    const { projectId } = req.params;
    const imageUrl = req.body.url || req.file?.path || req.file?.secure_url || req.file?.url;
    if (!imageUrl) return res.status(400).json({ message: "Missing image URL" });

    const updated = await populateProject(
      Project.findByIdAndUpdate(projectId, { imageUrl }, { new: true })
    );

    if (!updated) return res.status(404).json({ message: "Project not found" });
    return res.json(updated);
  } catch (error) {
    console.error("Error uploading cover photo:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
// =====================
// 📌 Delete Project
// =====================
export const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Optional: check permissions (e.g. only superadmin or assigned manager can delete)
    if (req.user.role !== "superadmin" && String(project.projectManager) !== String(req.user._id)) {
       return res.status(403).json({ message: "Unauthorized to delete this project" });
    }

    await Project.findByIdAndDelete(projectId);
    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error in deleteProject:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
