import express from "express";
import axios from "axios";
import { protectRoute } from "../middleware/auth.middleware.js";
import BlueprintAnalysis from "../models/analysis.model.js";
import cloudinary from "../lib/cloudinary.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();

// POST /summarize-call: Generate meeting minutes from raw transcript
router.post("/summarize-call", protectRoute, async (req, res) => {
  const { transcript } = req.body;
  if (!transcript) {
    return res.status(400).json({ error: "Transcript is required" });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are a professional construction project management AI. 
Read the following raw transcription of a video call between a Project Manager and a Client/Team.
Please generate a concise, professional "Meeting Minutes" document.
Include the following sections:
1. **Summary**: A brief 2-3 sentence overview of the discussion.
2. **Key Decisions**: Bullet points of any decisions made.
3. **Action Items**: Bullet points of tasks assigned or next steps.

Format the output entirely in clear Markdown. Keep it strictly professional and concise.

Raw Transcript:
"${transcript}"`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    res.json({ summary: responseText });
  } catch (error) {
    console.error("Error generating meeting summary:", error.message);
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

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
