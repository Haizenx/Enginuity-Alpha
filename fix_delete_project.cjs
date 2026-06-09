const fs = require('fs');

// 1. Update project.controller.js
const controllerFile = 'backend/src/controllers/project.controller.js';
let cContent = fs.readFileSync(controllerFile, 'utf8');

const newDeleteFunction = `
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
`;

if (!cContent.includes('export const deleteProject')) {
  cContent += newDeleteFunction;
  fs.writeFileSync(controllerFile, cContent);
}

// 2. Update project.routes.js
const routeFile = 'backend/src/routes/project.routes.js';
let rContent = fs.readFileSync(routeFile, 'utf8');

if (!rContent.includes('router.delete("/:projectId",')) {
  // Import it
  rContent = rContent.replace(
    'updateProjectStatus,',
    'updateProjectStatus,\n  deleteProject,'
  );

  // Add route
  rContent = rContent.replace(
    '// Activities',
    'router.delete("/:projectId", protectRoute, deleteProject);\n\n// Activities'
  );
  fs.writeFileSync(routeFile, rContent);
}

console.log('Project delete route added');
