import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import multer from "multer";
import {
  listManagerResetRequests,
  fulfillManagerReset,
  denyManagerReset,
  createUser,
  listUsers,
  getUser,
  updateUser,
  setUserPassword,
  deactivateUser,
  reactivateUser,
  forceResetUserPassword,
} from "../controllers/admin.controller.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

// All admin routes require auth + superadmin role
router.use(protectRoute, requireRole("superadmin"));

// Manager password reset requests
router.get("/manager-reset-requests", listManagerResetRequests);
router.post("/manager-reset-requests/:id/fulfill", fulfillManagerReset);
router.post("/manager-reset-requests/:id/deny", denyManagerReset);

// Accounts CRUD
router.post("/users", createUser);
router.get("/users", listUsers);
router.get("/users/:id", getUser);
router.patch("/users/:id", updateUser);
router.patch("/users/:id/password", setUserPassword);
router.post("/users/:id/force-reset", forceResetUserPassword);
router.patch("/users/:id/deactivate", deactivateUser);
router.patch("/users/:id/reactivate", reactivateUser);

// NEW: avatar upload for any user (admin-managed or self if admin role)
router.post("/users/:id/avatar", upload.single("profilePic"), async (req, res, next) => {
  try {
    const userId = req.params.id;
    // const url = await uploadToCloud(req.file.buffer, req.file.mimetype);
    // const user = await User.findByIdAndUpdate(userId, { profilePic: url }, { new: true });
    res.json({ user });
  } catch (e) {
    next(e);
  }
});

export default router;
