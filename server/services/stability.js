// server/services/stability.js

// Formula (three equally-weighted components, each mapped to 0-100 and averaged):
// 1. CV score     = max(0, 100 - (stdDev / mean * 100))  — lower income variability is better
// 2. Zero score   = (1 - zeroDayRatio) * 100              — fewer zero-income days is better
// 3. Buffer score = min(100, (emergency / weeklyFixed) * 100) — more emergency cover is better

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const std  = (xs) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

/**
 * Compute a 0-100 stability score for a set of payouts and bucket context.
 * @param {Array<{date:string, amount:number}>} payouts
 * @param {{ rent:number, emi:number, phone:number }} fixed
 * @param {{ emergency:number }} buckets  - computed buckets for the coming week
 * @returns {number} integer 0-100
 */
export function computeStabilityScore(payouts, fixed, buckets) {
  const amounts = payouts.map((p) => p.amount);
  if (!amounts.length) return 0;

  const m = mean(amounts);

  // Component 1: coefficient of variation (lower = more stable)
  const cvScore = m > 0 ? Math.max(0, 100 - (std(amounts) / m) * 100) : 0;

  // Component 2: zero-income day ratio (fewer zeros = better)
  const zeroDayRatio = amounts.filter((a) => a === 0).length / amounts.length;
  const zeroScore = (1 - zeroDayRatio) * 100;

  // Component 3: emergency buffer coverage vs weekly fixed costs
  const weeklyFixed = ((fixed.rent + fixed.emi + fixed.phone) * 7) / 30;
  const bufferScore = weeklyFixed > 0
    ? Math.min(100, ((buckets?.emergency ?? 0) / weeklyFixed) * 100)
    : 100;

  return Math.round((cvScore + zeroScore + bufferScore) / 3);
}
