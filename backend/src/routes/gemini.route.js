import express from "express";
import axios from "axios";

const router = express.Router();

router.post("/analyze", async (req, res) => {
  const { imageBase64, additionalPrompt } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: "Image data is missing." });
  }

  try {
    const apiKey = "AIzaSyArUa9bVSny-Nf_9y4LaNMvT3UF3BKYJhs";
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key is missing in server configuration." });
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `
You are an expert construction analyst.

Tasks:
1. Analyze the uploaded blueprint image for any measurement errors.
2. Recommend sustainable materials for construction.
3. Provide a price range in PHP for your recommended material.
4. Extract 5 important keywords related to the blueprint content.
5. Suggest 5 related questions that a user might ask about this blueprint.

Respond ONLY in the following JSON format:

{
  "analysis": "short analysis text here",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "relatedQuestions": ["question1", "question2", "question3", "question4", "question5"]
}

${additionalPrompt || ""}
              `,
            },
            {
              inline_data: {
                mime_type: "image/jpeg", // You can change this if needed (e.g., png)
                data: imageBase64,
              },
            },
          ],
        },
      ],
    };

    const { data } = await axios.post(endpoint, requestBody, {
      headers: { "Content-Type": "application/json" },
    });

    const geminiResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!geminiResponse) {
      return res.status(500).json({ error: "Invalid response from Gemini API." });
    }

    // Try parsing Gemini's response
    let parsedResult;
    try {
      parsedResult = JSON.parse(geminiResponse);
    } catch (parseError) {
      console.error("Error parsing Gemini response as JSON:", parseError.message);
      return res.status(500).json({ error: "Failed to parse Gemini response.", rawResponse: geminiResponse });
    }

    res.json(parsedResult);
  } catch (error) {
    console.error("Error contacting Gemini API:", error?.response?.data || error.message);
    res.status(500).json({ error: "Failed to contact Gemini API.", details: error?.response?.data || error.message });
  }
});

export default router;
