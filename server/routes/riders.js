// server/routes/riders.js
import { Router } from "express";
import { forecastNext7 } from "../services/forecast.js";
import { computeBuckets } from "../services/buckets.js";
import { computeStabilityScore } from "../services/stability.js";

// Assumed service contracts:
//   forecastNext7(payouts)         -> [{ date, predicted, low, high }] (next 7 days)
//   computeBuckets(rider, forecast) -> { buckets: { rent, emi, tax, emergency, spendable }, safeDailySpend }

const router = Router();

// List riders for the picker
router.get("/riders", (req, res) => {
  const list = req.app.locals.riders.map(({ id, name, city, platform }) => ({
    id,
    name,
    city,
    platform,
  }));
  res.json(list);
});

// Full dashboard payload for one rider
router.get("/riders/:id/summary", (req, res) => {
  const found = req.app.locals.riders.find((r) => r.id === req.params.id);
  if (!found) return res.status(404).json({ error: "Rider not found" });

  const { payouts, ...rider } = found;

  const history = payouts.map(({ date, amount }) => ({ date, amount }));
  const forecast = forecastNext7(payouts);
  const { buckets, safeDailySpend } = computeBuckets(rider, forecast);
  const stabilityScore = computeStabilityScore(payouts, rider.fixed, buckets);

  res.json({ rider, history, forecast, buckets, safeDailySpend, stabilityScore });
});

export default router;