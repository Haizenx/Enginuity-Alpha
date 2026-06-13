import mongoose from "mongoose";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import Project from "../models/project.model.js";
import SuperAdmin from "../models/superAdmin.model.js";
import { emitToUser } from "../lib/socket.js";

// =====================
// 📌 Sidebar Users
// =====================
export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const role = req.user.role;

    let users = [];

    if (role === "superadmin") {
      users = await User.find({ _id: { $ne: loggedInUserId } }).select(
        "-password -__v -loginAttempts -lockedUntil"
      );
    } else if (role === "project_manager") {
      const assignedProjects = await Project.find({
        $or: [
          { projectManager: loggedInUserId },
          { projectExtras: loggedInUserId },
        ],
      }).select("client projectManager projectExtras");

      const clientIds = assignedProjects.map((p) => p.client).filter(Boolean);
      
      const pmIds = [];
      for (const p of assignedProjects) {
        if (p.projectManager && String(p.projectManager) !== String(loggedInUserId)) pmIds.push(p.projectManager);
        if (Array.isArray(p.projectExtras)) {
            for (const extra of p.projectExtras) {
                if (String(extra) !== String(loggedInUserId)) pmIds.push(extra);
            }
        }
      }

      const clientsAndPms = await User.find({ _id: { $in: [...clientIds, ...pmIds] } }).select(
        "-password -__v -loginAttempts -lockedUntil"
      );

      const superAdmins = await SuperAdmin.find({}).select(
        "-password -__v -loginAttempts -lockedUntil"
      );

      const byId = new Map();
      for (const u of [...clientsAndPms, ...superAdmins]) byId.set(String(u._id), u);
      users = Array.from(byId.values());
    } else if (role === "client") {
      const myProjects = await Project.find({
        client: loggedInUserId,
      }).select("projectManager projectExtras");

      const pmIds = [];
      for (const p of myProjects) {
        if (p.projectManager) pmIds.push(p.projectManager);
        if (Array.isArray(p.projectExtras)) pmIds.push(...p.projectExtras);
      }

      const pms = await User.find({ _id: { $in: pmIds } }).select(
        "-password -__v -loginAttempts -lockedUntil"
      );

      const superAdmins = await SuperAdmin.find({}).select(
        "-password -__v -loginAttempts -lockedUntil"
      );

      const byId = new Map();
      for (const u of [...pms, ...superAdmins]) byId.set(String(u._id), u);
      users = Array.from(byId.values());
    }

    const enrichedUsers = await Promise.all(
      users.map(async (u) => {
        const uObj = u.toObject ? u.toObject() : u;
        const lastMsg = await Message.findOne({
          $or: [
            { senderId: loggedInUserId, receiverId: uObj._id },
            { senderId: uObj._id, receiverId: loggedInUserId },
          ],
        }).sort({ createdAt: -1 });

        return {
          ...uObj,
          lastActivity: lastMsg ? lastMsg.createdAt : uObj.createdAt,
        };
      })
    );

    res.status(200).json(enrichedUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// =====================
// 📌 Get Messages
// =====================
export const getMessages = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const { id: otherUserId } = req.params;

    const me = new mongoose.Types.ObjectId(loggedInUserId);
    const other = new mongoose.Types.ObjectId(otherUserId);

    const messages = await Message.find({
      $or: [
        { senderId: me, receiverId: other },
        { senderId: other, receiverId: me },
      ],
    }).sort({ createdAt: 1 });

    // Manual populate (sender/receiver may be in User or SuperAdmin)
    const populatedMessages = await Promise.all(
      messages.map(async (msg) => {
        const msgObj = msg.toObject();

        let sender = await User.findById(msg.senderId).select("fullName profilePic");
        if (!sender) sender = await SuperAdmin.findById(msg.senderId).select("fullName profilePic");

        let receiver = await User.findById(msg.receiverId).select("fullName profilePic");
        if (!receiver) receiver = await SuperAdmin.findById(msg.receiverId).select("fullName profilePic");

        return {
          ...msgObj,
          senderId: sender || msg.senderId,
          receiverId: receiver || msg.receiverId,
        };
      })
    );

    res.status(200).json(populatedMessages);
  } catch (error) {
    console.error("Error in getMessages:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// =====================
// 📌 Send Message
// =====================
export const sendMessage = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const { id: receiverId } = req.params;
    const { text, image } = req.body;

    const cleanText = typeof text === "string" ? text.trim() : "";

    if (!cleanText && !image) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    const newMessage = new Message({
      senderId: loggedInUserId,
      receiverId,
      text: cleanText,
      image: image || "",
    });

    const saved = await newMessage.save();

    // Manual populate for UI convenience
    let sender = await User.findById(saved.senderId).select("fullName profilePic");
    if (!sender) sender = await SuperAdmin.findById(saved.senderId).select("fullName profilePic");

    let receiver = await User.findById(saved.receiverId).select("fullName profilePic");
    if (!receiver) receiver = await SuperAdmin.findById(saved.receiverId).select("fullName profilePic");

    const populated = {
      ...saved.toObject(),
      senderId: sender || saved.senderId,
      receiverId: receiver || saved.receiverId,
    };

    // DEBUG: log ids before emit
    console.log("SEND EMIT -> receiver:", String(receiverId), {
      msgId: String(populated._id),
      senderId: String(
        typeof populated.senderId === "object" ? populated.senderId?._id : populated.senderId
      ),
      receiverId: String(
        typeof populated.receiverId === "object" ? populated.receiverId?._id : populated.receiverId
      ),
    });

    // Emit compact payload with string ids to allow client-side filtering/counting
    emitToUser(receiverId, "message:received", {
      _id: String(populated._id),
      text: populated.text || "",
      image: populated.image || "",
      createdAt: populated.createdAt,
      updatedAt: populated.updatedAt,
      senderId: String(
        typeof populated.senderId === "object" ? populated.senderId?._id : populated.senderId
      ),
      receiverId: String(
        typeof populated.receiverId === "object" ? populated.receiverId?._id : populated.receiverId
      ),
    });

    return res.status(201).json(populated);
  } catch (error) {
    console.error("Error in sendMessage:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
