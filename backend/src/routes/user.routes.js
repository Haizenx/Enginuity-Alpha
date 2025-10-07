import express from "express";
import User from "../models/user.model.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { sendWelcomeCredentials } from "../lib/mailer.js";
import { uploadAvatar } from "../middleware/upload.js";
import { deleteUser } from "../controllers/user.controller.js"; 

const router = express.Router();

// Helper function to generate username from full name
const generateUsername = (fullName, role) => {
  const cleanName = fullName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '.'); // Replace spaces with dots
  
  const suffix = role === "client" ? "@eng.client" : "@eng.pmanager";
  return `${cleanName}${suffix}`;
};

// Create Client with auto-generated credentials (SuperAdmin only)
router.post("/create-client-auto", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Access denied. Super admin only." });
    }

    const { fullName, email, contactNumber, location, description, startDate, endDate } = req.body;

    if (!email || !fullName) {
      return res.status(400).json({ message: "Email and full name are required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Generate username from full name
    let username = generateUsername(fullName, "client");
    
    // Check if username already exists, add number if needed
    let usernameExists = await User.findOne({ email: username });
    let counter = 1;
    while (usernameExists) {
      username = `${generateUsername(fullName, "client").replace('@eng.client', '')}${counter}@eng.client`;
      usernameExists = await User.findOne({ email: username });
      counter++;
    }

    // Check if email already exists (for notification purposes)
    const existingEmail = await User.findOne({ 
      $or: [
        { email: username }, // Check username (stored as email in DB)
      ]
    });
    
    if (existingEmail) {
      return res.status(400).json({ message: "User with this name already exists" });
    }

    // Generate temporary password (plain text - model will hash it)
    const tempPassword = Math.random().toString(36).slice(-8) + 'Cl!';

    const newClient = await User.create({
      email: username, // This is the username they'll use to login
      fullName,
      password: tempPassword, // Plain password - pre-save hook will hash it
      contactNumber,
      location,
      description,
      startDate,
      endDate,
      role: "client",
      profilePic: "",
      createdBy: req.user._id,
      isActive: true,
      loginAttempts: 0,
    });

    // Send welcome email with credentials to their actual email
    let emailSent = false;
    try {
      console.log(`Sending welcome email to client: ${email}`);
      await sendWelcomeCredentials({
        to: email, // Send to their actual email
        fullName: newClient.fullName,
        username: username, // The username they'll use to login
        tempPassword: tempPassword,
        role: "client",
      });
      emailSent = true;
      console.log("Welcome email sent successfully");
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
    }

    return res.status(201).json({
      message: "Client created successfully",
      user: {
        _id: newClient._id,
        fullName: newClient.fullName,
        username: username,
        notificationEmail: email,
        role: newClient.role,
        contactNumber: newClient.contactNumber,
        location: newClient.location,
        description: newClient.description,
        startDate: newClient.startDate,
        endDate: newClient.endDate,
      },
      credentials: { 
        username: username,
        password: tempPassword,
        notificationEmail: email,
      },
      emailSent,
    });
  } catch (error) {
    console.error("Error creating client:", error);
    return res.status(500).json({ message: error.message });
  }
});

// Create PM with auto-generated credentials (SuperAdmin only)
router.post("/create-pm-auto", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Access denied. Super admin only." });
    }

    const { fullName, email, contactNumber } = req.body;

    if (!email || !fullName) {
      return res.status(400).json({ message: "Email and full name are required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Generate username from full name
    let username = generateUsername(fullName, "project_manager");
    
    // Check if username already exists, add number if needed
    let usernameExists = await User.findOne({ email: username });
    let counter = 1;
    while (usernameExists) {
      username = `${generateUsername(fullName, "project_manager").replace('@eng.pmanager', '')}${counter}@eng.pmanager`;
      usernameExists = await User.findOne({ email: username });
      counter++;
    }

    // Check if username already exists
    const existingUser = await User.findOne({ email: username });
    if (existingUser) {
      return res.status(400).json({ message: "User with this name already exists" });
    }

    // Generate temporary password (plain text - model will hash it)
    const tempPassword = Math.random().toString(36).slice(-8) + 'Pm!';

    const newPM = await User.create({
      email: username, // This is the username they'll use to login
      fullName,
      password: tempPassword, // Plain password - pre-save hook will hash it
      contactNumber,
      role: "project_manager",
      profilePic: "",
      createdBy: req.user._id,
      isActive: true,
      loginAttempts: 0,
    });

    // Send welcome email with credentials to their actual email
    let emailSent = false;
    try {
      console.log(`Sending welcome email to PM: ${email}`);
      await sendWelcomeCredentials({
        to: email, // Send to their actual email
        fullName: newPM.fullName,
        username: username, // The username they'll use to login
        tempPassword: tempPassword,
        role: "project_manager",
      });
      emailSent = true;
      console.log("Welcome email sent successfully");
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
    }

    return res.status(201).json({
      message: "Project Manager created successfully",
      user: {
        _id: newPM._id,
        fullName: newPM.fullName,
        username: username,
        notificationEmail: email,
        role: newPM.role,
        contactNumber: newPM.contactNumber,
      },
      credentials: { 
        username: username,
        password: tempPassword,
        notificationEmail: email,
      },
      emailSent,
    });
  } catch (error) {
    console.error("Error creating PM:", error);
    return res.status(500).json({ message: error.message });
  }
});
// Get all clients (SuperAdmin only)
router.get("/clients", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Access denied" });
    }
    
    const clients = await User.find({ role: "client" })
      .select("-password")
      .sort({ createdAt: -1 });
    
    return res.json(clients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get all project managers (SuperAdmin only)
router.get("/project-managers", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Access denied" });
    }
    
    const projectManagers = await User.find({ role: "project_manager" })
      .select("-password")
      .sort({ createdAt: -1 });
    
    return res.json(projectManagers);
  } catch (error) {
    console.error("Error fetching project managers:", error);
    return res.status(500).json({ message: "Server error" });
  }
});// Get all clients (SuperAdmin only)
router.get("/clients", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Access denied" });
    }
    
    const clients = await User.find({ role: "client" })
      .select("-password")
      .sort({ createdAt: -1 });
    
    return res.json(clients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get all users (Admin only)
router.get("/", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    const users = await User.find().select("-password");
    return res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get current user profile
router.get("/profile", protectRoute, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    return res.json(user);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// Update profile picture (any authenticated user)
router.put(
  "/profile/picture",
  protectRoute,
  (req, res, next) => {
    uploadAvatar.single("profilePic")(req, res, (err) => {
      if (err) return next(err);
      return next();
    });
  },
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.profilePic = req.file.path;
      await user.save();

      return res.json({
        message: "Profile picture updated successfully",
        profilePic: user.profilePic,
      });
    } catch (error) {
      return next(error);
    }
  }
);

// Update user profile
router.put("/profile", protectRoute, async (req, res) => {
  try {
    const { name, email, phone, bio } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (bio) user.bio = bio;

    await user.save();

    return res.json({
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        bio: user.bio,
        profilePic: user.profilePic,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// Create new user (Admin only)
router.post("/", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { name, email, role, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const tempPassword = Math.random().toString(36).slice(-8);

    const user = new User({
      name,
      email,
      password: tempPassword,
      role,
      phone,
    });

    await user.save();

    await sendWelcomeCredentials(email, name, tempPassword);

    return res.status(201).json({
      message: "User created successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// Update user by ID (Admin only)
router.put("/:id", protectRoute, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { name, email, role, phone } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (phone) user.phone = phone;

    await user.save();

    return res.json({
      message: "User updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// Delete user (Admin only)
router.delete("/:id", protectRoute, deleteUser);

export default router;
