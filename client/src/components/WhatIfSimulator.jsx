// client/src/components/WhatIfSimulator.jsx
import { useEffect, useRef, useState } from "react";
import { simulate as apiSimulate } from "../api";

const rupees = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;

// Slider for days off; `simulate(riderId, skipDays)` must return a promise of the API result
export default function WhatIfSimulator({ riderId, simulate = apiSimulate }) {
  const [skipDays, setSkipDays] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const latestRequest = useRef(0);

  // Back to 0 days when the rider changes
  useEffect(() => {
    setSkipDays(0);
  }, [riderId]);

  // Re-run on every change; ignore responses that arrive out of order
  useEffect(() => {
    if (!riderId) return;
    const requestId = ++latestRequest.current;
    setError("");

    simulate(riderId, skipDays)
      .then((data) => {
        if (requestId === latestRequest.current) setResult(data);
      })
      .catch(() => {
        if (requestId === latestRequest.current) setError("Could not run the simulation.");
      });
  }, [riderId, skipDays, simulate]);

  return (
    <section className="card simulator">
      <h2 className="card-title">What if I take days off?</h2>

      <label className="slider-label" htmlFor="skip-days">
        Days off this week: <strong>{skipDays}</strong>
      </label>
      <input
        id="skip-days"
        className="slider"
        type="range"
        min={0}
        max={7}
        step={1}
        value={skipDays}
        onChange={(e) => setSkipDays(Number(e.target.value))}
      />
      <div className="slider-scale" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
          <span key={n} className={n === skipDays ? "active" : ""}>
            {n}
          </span>
        ))}
      </div>

      {error && <p className="sim-error" role="alert">{error}</p>}

      {result && (
        <>
          <div className="sim-stats">
            <div className="sim-stat">
              <span className="sim-stat-label">Normal week</span>
              <span className="sim-stat-value">{rupees(result.baselineWeekly)}</span>
            </div>
            <div className="sim-stat">
              <span className="sim-stat-label">With {skipDays} day(s) off</span>
              <span className="sim-stat-value">{rupees(result.adjustedWeekly)}</span>
            </div>
            <div className={`sim-stat ${result.shortfall > 0 ? "sim-stat--bad" : ""}`}>
              <span className="sim-stat-label">Shortfall</span>
              <span className="sim-stat-value">{rupees(result.shortfall)}</span>
            </div>
            <div className="sim-stat">
              <span className="sim-stat-label">Emergency fund impact</span>
              <span className="sim-stat-value">
                {result.emergencyImpact > 0 ? `-${rupees(result.emergencyImpact)}` : rupees(0)}
              </span>
            </div>
          </div>

          {result.emiAtRisk && (
            <div className="warning warning--danger" role="alert">
              ⚠️ Your EMI is at risk this week. Taking {skipDays} day(s) off leaves too little
              to cover it.
            </div>
          )}
        </>
      )}
    </section>
  );
}