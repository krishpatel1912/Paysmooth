// server/routes/analyze.js
// POST /api/analyze — accepts inline profile + payouts, returns same shape as
// GET /api/riders/:id/summary plus stabilityScore.

import { Router } from "express";
import { forecastNext7 } from "../services/forecast.js";
import { computeBuckets } from "../services/buckets.js";
import { computeStabilityScore } from "../services/stability.js";
import { validateInlineProfile } from "../utils/validateInline.js";

const router = Router();

router.post("/analyze", (req, res) => {
  const { profile, payouts: payoutsRaw } = req.body ?? {};

  const result = validateInlineProfile(profile, payoutsRaw);
  if (result.error) return res.status(400).json({ error: result.error });

  const { rider, payouts } = result;

  const history  = payouts.map(({ date, amount }) => ({ date, amount }));
  const forecast = forecastNext7(payouts);
  const { buckets, safeDailySpend } = computeBuckets(rider, forecast);
  const stabilityScore = computeStabilityScore(payouts, rider.fixed, buckets);

  res.json({ rider, history, forecast, buckets, safeDailySpend, stabilityScore });
});

export default router;
