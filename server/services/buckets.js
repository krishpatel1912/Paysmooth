// server/services/buckets.js
import { forecast } from "./forecast.js";

// Formulas (weekly): monthly fixed cost x 7/30 = weekly share; tax = 5% and emergency = 10% of forecast income.
// Money fills buckets in order rent -> emi -> tax -> emergency, each capped at its target, so shortfalls hit the later buckets first.
// Spendable = what is left after the phone bill; safeDailySpend = spendable / 7, rounded down.

const TAX_RATE = 0.05;
const EMERGENCY_RATE = 0.1;

const weekly = (monthly) => (monthly * 7) / 30;
const sumPredicted = (days) => days.reduce((total, d) => total + d.predicted, 0);

// Split one week's expected income into buckets
export function buildBuckets(weeklyForecastTotal, fixed) {
  let remaining = Math.max(0, weeklyForecastTotal);

  // Take up to `target` from what is left
  const fill = (target) => {
    const amount = Math.min(target, remaining);
    remaining -= amount;
    return amount;
  };

  const rent = fill(weekly(fixed.rent));
  const emi = fill(weekly(fixed.emi));
  const tax = fill(weeklyForecastTotal * TAX_RATE);
  const emergency = fill(weeklyForecastTotal * EMERGENCY_RATE);
  const spendable = Math.max(0, remaining - weekly(fixed.phone));

  const buckets = {
    rent: Math.round(rent),
    emi: Math.round(emi),
    tax: Math.round(tax),
    emergency: Math.round(emergency),
    spendable: Math.round(spendable),
  };

  return { buckets, safeDailySpend: Math.floor(spendable / 7) };
}

// Compute buckets from a rider object and a 7-day forecast array
export function computeBuckets(rider, forecastDays) {
  const weeklyForecastTotal = sumPredicted(forecastDays);
  return buildBuckets(weeklyForecastTotal, rider.fixed);
}

// What if the rider skips `skipDays` working days this week?
export function simulateSkip(history, fixed, skipDays) {
  const baselineWeekly = sumPredicted(forecast(history));
  const adjustedWeekly = (baselineWeekly * (7 - skipDays)) / 7;

  const baseline = buildBuckets(baselineWeekly, fixed).buckets;
  const adjusted = buildBuckets(adjustedWeekly, fixed).buckets;

  const weeklyFixed = weekly(fixed.rent + fixed.emi + fixed.phone);

  return {
    baselineWeekly: Math.round(baselineWeekly),
    adjustedWeekly: Math.round(adjustedWeekly),
    shortfall: Math.round(Math.max(0, weeklyFixed - adjustedWeekly)),
    emiAtRisk: adjusted.emi < Math.round(weekly(fixed.emi)),
    emergencyImpact: baseline.emergency - adjusted.emergency,
  };
}