// server/routes/simulate.js
import { Router } from "express";
import { forecastNext7 } from "../services/forecast.js";
import { computeBuckets } from "../services/buckets.js";
import { validateInlineProfile } from "../utils/validateInline.js";

const router = Router();

const sum   = (arr, key) => arr.reduce((total, item) => total + item[key], 0);
const round = (n) => Math.round(n);

// What happens if the rider skips some working days this week?
// Accepts: { riderId, skipDays }  OR  { profile, payouts, skipDays }
router.post("/simulate", (req, res) => {
  const { riderId, profile, payouts: payoutsRaw, skipDays } = req.body ?? {};

  const skip = Number(skipDays);
  if (!Number.isInteger(skip) || skip < 0 || skip > 7) {
    return res.status(400).json({ error: "skipDays must be a whole number from 0 to 7" });
  }

  let rider, payouts;

  if (riderId) {
    // Existing rider path
    const found = req.app.locals.riders.find((r) => r.id === riderId);
    if (!found) return res.status(404).json({ error: "Rider not found" });
    ({ payouts, ...rider } = found);
  } else {
    // Inline profile path
    const result = validateInlineProfile(profile, payoutsRaw);
    if (result.error) return res.status(400).json({ error: result.error });
    ({ rider, payouts } = result);
  }

  const forecast = forecastNext7(payouts);

  // Spread the lost days evenly across the week's predicted earnings
  const keepRatio      = (7 - skip) / 7;
  const adjustedForecast = forecast.map((day) => ({
    ...day,
    predicted: day.predicted * keepRatio,
    low:       day.low       * keepRatio,
    high:      day.high      * keepRatio,
  }));

  const baselineWeekly = sum(forecast, "predicted");
  const adjustedWeekly = sum(adjustedForecast, "predicted");

  // Weekly share of monthly fixed costs
  const { rent, emi, phone } = rider.fixed;
  const weeklyFixed = ((rent + emi + phone) * 7) / 30;
  const weeklyEmi   = (emi * 7) / 30;

  const baseline = computeBuckets(rider, forecast).buckets;
  const adjusted = computeBuckets(rider, adjustedForecast).buckets;

  res.json({
    baselineWeekly: round(baselineWeekly),
    adjustedWeekly: round(adjustedWeekly),
    shortfall:       round(Math.max(0, weeklyFixed - adjustedWeekly)),
    emiAtRisk:       adjusted.emi < round(weeklyEmi) - 1,
    emergencyImpact: round(baseline.emergency - adjusted.emergency),
  });
});

export default router;