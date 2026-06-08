import express from "express";
import axios from "axios";
import { protectRoute } from "../middleware/auth.middleware.js";
import BlueprintAnalysis from "../models/analysis.model.js";
import cloudinary from "../lib/cloudinary.js";

const router = express.Router();

// GET /history: Fetch user's analysis history
router.get("/history", protectRoute, async (req, res) => {
  try {
    const history = await BlueprintAnalysis.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    res.json(history);
  } catch (error) {
    console.error("Error fetching analysis history:", error.message);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// POST /history: Save an analysis result from the frontend
router.post("/history", protectRoute, async (req, res) => {
  const { imageBase64, analysis, keywords, relatedQuestions } = req.body;
  
  if (!analysis) {
    return res.status(400).json({ error: "Analysis data is required." });
  }

  try {
    // Upload image to Cloudinary (using data URI)
    let secure_url = "";
    if (imageBase64) {
      const dataUri = imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
      const uploadRes = await cloudinary.uploader.upload(dataUri, {
        folder: 'blueprint_analyses'
      });
      secure_url = uploadRes.secure_url;
    }

    // Save to Database
    const newAnalysis = new BlueprintAnalysis({
      userId: req.user._id,
      imageUrl: secure_url,
      analysis,
      keywords: keywords || [],
      relatedQuestions: relatedQuestions || []
    });
    
    await newAnalysis.save();

    res.json(newAnalysis);
  } catch (error) {
    console.error("Error saving analysis history:", error.message);
    res.status(500).json({ error: "Failed to save analysis history" });
  }
});

export default router;
