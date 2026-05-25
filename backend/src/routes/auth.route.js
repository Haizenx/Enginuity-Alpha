// routes/auth.routes.js
import express from "express";
import {
  signup,
  login,
  logout,
  updateProfile,
  checkAuth,
  updatePassword,
  forgotPassword,
  forgotPasswordMobile,
  resetPasswordMobile,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public
router.post("/signup", signup);
router.post("/login", login);
router.post("/forgot-password", forgotPassword); // generic, no-email, queues admin request
router.post("/forgot-password-mobile", forgotPasswordMobile); // OTP-based, sends email for mobile
router.post("/reset-password-mobile", resetPasswordMobile);   // OTP-based password reset for mobile


// Protected
router.post("/logout", protectRoute, logout);
router.put("/update-profile", protectRoute, updateProfile);
router.get("/check", protectRoute, checkAuth);

// User update password (self-service while authenticated)
router.put("/password", protectRoute, updatePassword);

export default router;
