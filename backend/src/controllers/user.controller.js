import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { sendWelcomeCredentials } from "../lib/mailer.js";

/**
 * Create a new client (superadmin only)
 */
export const createClient = async (req, res) => {
  try {
    if (req.userType !== "superadmin") {
      return res.status(403).json({ message: "Forbidden: Super admin only." });
    }

    const { email, fullName, password, contactNumber, location, description } = req.body;
    if (!email || !fullName || !password) {
      return res.status(400).json({ message: "Email, full name, and password are required." });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already exists." });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newClient = await User.create({
      email,
      fullName,
      password: hashedPassword,
      contactNumber,
      location,
      description,
      role: "client",
      createdBy: req.user._id,
    });

    // Email credentials
    let emailSent = false;
    try {
      console.log("📧 Attempting to send welcome email to client:", newClient.email);
      await sendWelcomeCredentials({
        to: newClient.email,
        fullName: newClient.fullName,
        email: newClient.email,
        tempPassword: password,
        role: "client",
      });
      emailSent = true;
      console.log("✅ Welcome email sent successfully");
    } catch (e) {
      console.error("❌ Welcome email (client) failed - FULL ERROR:", e);
    }

    res.status(201).json({
      message: "Client created successfully",
      user: newClient,
      credentials: { email: newClient.email, password },
      emailSent,
    });
  } catch (error) {
    console.error("Error creating client:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Create a new project manager (superadmin only)
 */
export const createProjectManager = async (req, res) => {
  try {
    if (req.userType !== "superadmin") {
      return res.status(403).json({ message: "Forbidden: Super admin only." });
    }

    const { email, fullName, password, contactNumber } = req.body;
    if (!email || !fullName || !password) {
      return res.status(400).json({ message: "Email, full name, and password are required." });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already exists." });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newPM = await User.create({
      email,
      fullName,
      password: hashedPassword,
      contactNumber,
      role: "project_manager",
      createdBy: req.user._id,
    });

    // Email credentials
    let emailSent = false;
    try {
      console.log("📧 Attempting to send welcome email to PM:", newPM.email);
      await sendWelcomeCredentials({
        to: newPM.email,
        fullName: newPM.fullName,
        email: newPM.email,
        tempPassword: password,
        role: "project_manager",
      });
      emailSent = true;
      console.log("✅ Welcome email sent successfully");
    } catch (e) {
      console.error("❌ Welcome email (PM) failed - FULL ERROR:", e);
    }

    res.status(201).json({
      message: "Project Manager created successfully",
      user: newPM,
      credentials: { email: newPM.email, password },
      emailSent,
    });
  } catch (error) {
    console.error("Error creating project manager:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Generic get all users by role
 */
export const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;
    const users = await User.find({ role }).select("-password");
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update user by ID
 */
export const updateUser = async (req, res) => {
  try {
    const updates = req.body;
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * ✅ Update user avatar
 */
export const updateUserAvatar = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { avatar: avatarUrl },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error("Error uploading avatar:", error);
    res.status(500).json({ message: "Avatar upload failed", error });
  }
};

/**
 * Delete user by ID
 */
export const deleteUser = async (req, res) => {
  try {
    // This check is now inside the controller
    const allowedRoles = ['admin', 'superadmin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: You do not have permission to delete users." });
    }

    // Get the user ID from the URL parameters
    const { id } = req.params;

    // Find the user by their ID and delete them
    const deletedUser = await User.findByIdAndDelete(id);

    // If no user was found with that ID, return a 404 error
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send a success response
    res.status(200).json({ message: "User deleted successfully" });

  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Server error while deleting user" });
  }
};

