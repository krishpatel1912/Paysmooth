// server/routes/extractEarnings.js
import { Router } from "express";
import { extractEarningsFromImage } from "../services/gemini.js";

const router = Router();

// POST /api/extract-earnings
// Expects: { imageBase64, mimeType }
// Returns: [{ date: "YYYY-MM-DD", amount: number }]
router.post("/extract-earnings", async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({
        error: "imageBase64 is required. Please provide a valid screenshot."
      });
    }

    const rows = await extractEarningsFromImage(imageBase64, mimeType || "image/png");
    return res.json({ payouts: rows });
  } catch (err) {
    console.error("Error in /api/extract-earnings:", err.message);
    return res.status(500).json({
      error: "Failed to extract earnings from screenshot. Please try another image or use CSV upload instead."
    });
  }
});

export default router;
