// server/routes/coach.js
// POST /api/coach - generate localized financial coach message
// Accepts: { riderId, language }  OR  { profile, payouts, language }

import express from "express";
import { getCoachMessage } from "../services/gemini.js";
import { forecastNext7 } from "../services/forecast.js";
import { computeBuckets } from "../services/buckets.js";
import { validateInlineProfile } from "../utils/validateInline.js";

const router = express.Router();

router.post("/coach", async (req, res) => {
  try {
    const { riderId, profile, payouts: payoutsRaw, language } = req.body ?? {};

    let rider, payouts;

    if (riderId) {
      // Existing named-rider path
      const found = req.app?.locals?.riders?.find((r) => r.id === riderId);
      if (!found) return res.status(404).json({ error: "Rider not found" });
      ({ payouts, ...rider } = found);
    } else {
      // Inline profile path
      const result = validateInlineProfile(profile, payoutsRaw);
      if (result.error) return res.status(400).json({ error: result.error });
      ({ rider, payouts } = result);
    }

    // Determine target language: payload override > rider preference > fallback 'en'
    const targetLanguage = language || rider.language || "en";

    const forecast = forecastNext7(payouts ?? []);
    const { buckets } = computeBuckets(rider, forecast);

    const message = await getCoachMessage({ rider, forecast, buckets, language: targetLanguage });

    return res.json({ message });
  } catch (err) {
    console.error("Error in /api/coach route:", err);
    return res.status(500).json({
      error: "Failed to generate coaching message",
      message: "Please ensure your daily spending stays within your safe budget limit.",
    });
  }
});

export default router;