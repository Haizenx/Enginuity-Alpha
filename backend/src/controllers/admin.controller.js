import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import User from "../models/user.model.js";
import AdminResetRequest from "../models/adminResetRequest.model.js";
import { sendAdminResetNotice } from "../lib/mailer.js";
import { sendWelcomeCredentials } from "../lib/mailer.js";

// Optional cloud providers — enable the one you use
// CLOUDINARY
// import { v2 as cloudinary } from "cloudinary";
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// AWS S3 (v3 SDK)
// import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
// const s3 = new S3Client({
//   region: process.env.AWS_REGION,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   },
// });

/**
 * Helpers
 */

// Save buffer to local disk and return a public URL (dev fallback)
const saveBufferToLocal = async (buf, filename) => {
  const uploadsDir = path.join(process.cwd(), "uploads", "avatars");
  await fs.promises.mkdir(uploadsDir, { recursive: true });
  const filePath = path.join(uploadsDir, filename);
  await fs.promises.writeFile(filePath, buf);
  // Expose /uploads as static in your app.js: app.use("/uploads", express.static("uploads"));
  const publicUrl = `/uploads/avatars/${filename}`;
  return publicUrl;
};

// Pick a deterministic filename variant
const makeAvatarFilename = (userId, mimetype) => {
  const ext = mimetype?.split("/")?.[1] || "jpg";
  return `${userId}-avatar.${ext}`;
};

// Upload strategy switcher returning a URL
const persistAvatar = async ({ buffer, mimetype, userId }) => {
  // 1) CLOUDINARY
  // const upload = await cloudinary.uploader.upload_stream({
  //   folder: "avatars",
  //   resource_type: "image",
  // }, ...);  // Cloudinary stream handling requires wrapping in a Promise
  // return upload.secure_url;

  // 2) AWS S3
  // const key = `avatars/${makeAvatarFilename(userId, mimetype)}`;
  // await s3.send(new PutObjectCommand({
  //   Bucket: process.env.AWS_S3_BUCKET,
  //   Key: key,
  //   Body: buffer,
  //   ContentType: mimetype,
  //   ACL: "public-read",
  // }));
  // return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  // 3) LOCAL (default/dev)
  const filename = makeAvatarFilename(userId, mimetype);
  return await saveBufferToLocal(buffer, filename);
};

/**
 * List manager password reset requests (Super Admin only)
 */
export const listManagerResetRequests = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20, sort = "-createdAt" } = req.query;

    const q = {};
    if (status) q.status = status;

    const matchUser = {};
    if (search) {
      const rx = new RegExp(search, "i");
      matchUser.$or = [{ email: rx }, { fullName: rx }];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      AdminResetRequest.find(q)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .populate({
          path: "managerUserId",
          select: "email fullName role isActive",
          match: matchUser,
        }),
      AdminResetRequest.countDocuments(q),
    ]);

    const filtered = items.filter((i) => i.managerUserId);
    res.json({ data: filtered, page: Number(page), limit: Number(limit), total });
  } catch (e) {
    next(e);
  }
};

/**
 * Fulfill a manager reset request
 */
export const fulfillManagerReset = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword, notes, mustChangeAtNextLogin } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters." });
    }

    const request = await AdminResetRequest.findById(id).populate("managerUserId");
    if (!request || request.status !== "pending") {
      return res.status(404).json({ message: "Request not found or already processed." });
    }

    const manager = request.managerUserId;
    if (!manager || manager.role !== "project_manager") {
      return res.status(400).json({ message: "Target user is not a project manager." });
    }

    manager.password = newPassword; // hashed in pre-save
    if (mustChangeAtNextLogin) manager.mustChangePassword = true;
    await manager.save();

    request.status = "approved";
    request.processedBy = req.user._id;
    request.processedAt = new Date();
    request.notes = notes;
    await request.save();

    let emailSent = false;
    try {
      await sendAdminResetNotice({
        to: manager.email,
        fullName: manager.fullName,
        tempPassword: newPassword,
      });
      emailSent = true;
    } catch (e) {
      console.error("Admin reset email failed:", e.message);
    }

    res.json({ message: "Password updated by admin.", emailSent });
  } catch (e) {
    next(e);
  }
};

/**
 * Deny a manager reset request
 */
export const denyManagerReset = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const request = await AdminResetRequest.findById(id);
    if (!request || request.status !== "pending") {
      return res.status(404).json({ message: "Request not found or already processed." });
    }

    request.status = "denied";
    request.processedBy = req.user._id;
    request.processedAt = new Date();
    request.notes = notes;
    await request.save();

    res.json({ message: "Request denied." });
  } catch (e) {
    next(e);
  }
};

/**
 * Basic Accounts CRUD
 */
export const createUser = async (req, res, next) => {
  try {
    const { fullName, email, password, role = "client", isActive = true } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Missing required fields." });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ message: "Email already exists." });

    const user = await User.create({
      fullName,
      email,
      password, // hashed by pre-save
      role,
      isActive,
    });

    let emailSent = false;
    try {
      await sendWelcomeCredentials({
        to: user.email,
        fullName: user.fullName,
        email: user.email,
        tempPassword: password,
        role: user.role,
      });
      emailSent = true;
    } catch (e) {
      console.error("Welcome email failed:", e.message);
    }

    res.status(201).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      emailSent,
    });
  } catch (e) {
    next(e);
  }
};

export const listUsers = async (req, res, next) => {
  try {
    const { role, status, search, page = 1, limit = 20, sort = "-createdAt" } = req.query;

    const q = {};
    if (role) q.role = role;
    if (status === "active") q.isActive = true;
    if (status === "inactive") q.isActive = false;
    if (search) {
      const rx = new RegExp(search, "i");
      q.$or = [{ email: rx }, { fullName: rx }];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      User.find(q).sort(sort).skip(skip).limit(Number(limit)).select("-password"),
      User.countDocuments(q),
    ]);

    res.json({ data: items, page: Number(page), limit: Number(limit), total });
  } catch (e) {
    next(e);
  }
};

export const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json(user);
  } catch (e) {
    next(e);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const allowed = ["fullName", "role", "isActive", "contactNumber", "location", "description"];
    const patch = {};
    for (const k of allowed) {
      if (k in req.body) patch[k] = req.body[k];
    }

    const user = await User.findByIdAndUpdate(id, patch, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });

    res.json(user);
  } catch (e) {
    next(e);
  }
};

export const setUserPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword, mustChangeAtNextLogin } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters." });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found." });

    user.password = newPassword; // hashed by pre-save
    if (mustChangeAtNextLogin) user.mustChangePassword = true;
    await user.save();

    res.json({ message: "Password updated." });
  } catch (e) {
    next(e);
  }
};

export const deactivateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, { isActive: false }, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json(user);
  } catch (e) {
    next(e);
  }
};

export const reactivateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, { isActive: true }, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json(user);
  } catch (e) {
    next(e);
  }
};

/**
 * NEW: Update user avatar (Super Admin managed)
 * Route: POST /api/admin/users/:id/avatar
 * Middleware: protectRoute, requireRole("superadmin"), multer.single("profilePic")
 */
export const updateUserAvatar = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded. Use field name 'profilePic'." });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found." });

    // Persist and get a URL
    const url = await persistAvatar({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      userId: id,
    });

    user.profilePic = url;
    await user.save();

    // Return sanitized user
    const safe = await User.findById(id).select("-password");
    res.json({ user: safe });
  } catch (e) {
    next(e);
  }
};

/**
 * Force reset a user's password (Super Admin action)
 * Generates a temp password and attempts to email it.
 */
export const forceResetUserPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found." });

    // Generate a random 8-character temp password
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let tempPassword = "";
    for (let i = 0; i < 8; i++) {
      tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    user.password = tempPassword; // hashed by pre-save
    await user.save();

    let emailSent = false;
    const targetEmail = user.recoveryEmail || user.email; // prioritize recovery email if it exists
    if (targetEmail) {
      try {
        await sendAdminResetNotice({
          to: targetEmail,
          fullName: user.fullName,
          tempPassword: tempPassword,
        });
        emailSent = true;
      } catch (e) {
        console.error("Force reset email failed:", e.message);
      }
    }

    res.json({ message: "Password force reset.", tempPassword, emailSent });
  } catch (e) {
    next(e);
  }
};
