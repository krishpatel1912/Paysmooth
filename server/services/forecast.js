// server/services/forecast.js

const WMA_DAYS = 14; // recent window for the weighted moving average
const BLEND = 0.5;   // share of the moving average vs the day-of-week average

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

const std = (xs) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

// Parse YYYY-MM-DD as UTC so weekdays don't shift with the server timezone
const toUtc = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

// Linear weights: the latest day counts most
function weightedMovingAverage(amounts) {
  const recent = amounts.slice(-WMA_DAYS);
  let num = 0;
  let den = 0;
  recent.forEach((value, i) => {
    num += value * (i + 1);
    den += i + 1;
  });
  return den ? num / den : 0;
}

// Predict the next 7 days: blend recent level with each weekday's historical average
export function forecast(payouts) {
  const sorted = [...payouts].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return [];

  const amounts = sorted.map((p) => p.amount);
  const level = weightedMovingAverage(amounts);
  const overallSd = std(amounts);

  // Group history by weekday (0 = Sunday ... 6 = Saturday)
  const byWeekday = Array.from({ length: 7 }, () => []);
  for (const p of sorted) byWeekday[toUtc(p.date).getUTCDay()].push(p.amount);

  const last = toUtc(sorted[sorted.length - 1].date);

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(last);
    day.setUTCDate(last.getUTCDate() + i + 1);

    const samples = byWeekday[day.getUTCDay()];
    const weekdayAvg = samples.length ? mean(samples) : level;
    const predicted = BLEND * level + (1 - BLEND) * weekdayAvg;
    const sd = samples.length > 1 ? std(samples) : overallSd;

    return {
      date: day.toISOString().slice(0, 10),
      predicted: Math.round(predicted),
      low: Math.max(0, Math.round(predicted - sd)),
      high: Math.round(predicted + sd),
    };
  });
}

export const forecastNext7 = forecast;