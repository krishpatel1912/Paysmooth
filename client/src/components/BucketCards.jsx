// client/src/components/BucketCards.jsx
import { useEffect, useState } from "react";

const BUCKETS = [
  { key: "rent", label: "Rent", hint: "Set aside for the landlord" },
  { key: "emi", label: "EMI", hint: "Loan instalment share" },
  { key: "tax", label: "Tax", hint: "5% set-aside" },
  { key: "emergency", label: "Emergency", hint: "10% safety cushion" },
  { key: "spendable", label: "Spendable", hint: "Free to use this week" },
];

const rupees = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;

// One card per bucket; the bar shows its share of this week's total
export default function BucketCards({ buckets, safeDailySpend }) {
  const total = BUCKETS.reduce((sum, b) => sum + (buckets[b.key] || 0), 0);

  // Start bars at 0, then grow to the real width so the CSS transition plays
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section className="bucket-section">
      <div className="bucket-header">
        <h2 className="card-title">This week's buckets</h2>
        {safeDailySpend !== undefined && (
          <p className="safe-spend">
            Safe to spend per day: <strong>{rupees(safeDailySpend)}</strong>
          </p>
        )}
      </div>

      <div className="bucket-grid">
        {BUCKETS.map(({ key, label, hint }) => {
          const amount = buckets[key] || 0;
          const pct = total > 0 ? Math.round((amount / total) * 100) : 0;

          return (
            <article key={key} className={`card bucket-card bucket-card--${key}`}>
              <div className="bucket-top">
                <h3 className="bucket-label">{label}</h3>
                <span className="bucket-pct">{pct}%</span>
              </div>
              <p className="bucket-amount">{rupees(amount)}</p>
              <div
                className="progress"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${label} share of weekly income`}
              >
                <div
                  className="progress-fill"
                  style={{ width: grown ? `${pct}%` : "0%" }}
                />
              </div>
              <p className="bucket-hint">{hint}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}