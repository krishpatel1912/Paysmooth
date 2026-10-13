// client/src/components/LeavePlannerPage.jsx
import { useState, useEffect, useRef } from "react";
import { simulate as apiSimulate } from "../api";

const DAYS_OF_WEEK = [
  { key: "mon", label: "Monday", short: "Mon" },
  { key: "tue", label: "Tuesday", short: "Tue" },
  { key: "wed", label: "Wednesday", short: "Wed" },
  { key: "thu", label: "Thursday", short: "Thu" },
  { key: "fri", label: "Friday", short: "Fri" },
  { key: "sat", label: "Saturday", short: "Sat" },
  { key: "sun", label: "Sunday", short: "Sun" },
];

const rupees = (n) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;

export default function LeavePlannerPage({
  rider,
  riderIdOrData,
  simulate = apiSimulate,
  onBackToDashboard
}) {
  // Selected specific days off
  const [selectedDays, setSelectedDays] = useState(["wed"]); // default 1 day off
  const [skipDays, setSkipDays] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const latestRequest = useRef(0);

  // Toggle individual day off
  function handleToggleDay(dayKey) {
    let next;
    if (selectedDays.includes(dayKey)) {
      next = selectedDays.filter((d) => d !== dayKey);
    } else {
      next = [...selectedDays, dayKey];
    }
    setSelectedDays(next);
    setSkipDays(next.length);
  }

  // Handle slider change (synchronizes selectedDays array)
  function handleSliderChange(val) {
    const num = Number(val);
    setSkipDays(num);
    if (num === 0) {
      setSelectedDays([]);
    } else if (num > selectedDays.length) {
      // Add days from the beginning of unselected
      const available = DAYS_OF_WEEK.map((d) => d.key).filter((k) => !selectedDays.includes(k));
      setSelectedDays([...selectedDays, ...available.slice(0, num - selectedDays.length)]);
    } else if (num < selectedDays.length) {
      // Trim from the end
      setSelectedDays(selectedDays.slice(0, num));
    }
  }

  // Run simulation whenever skipDays or rider changes
  useEffect(() => {
    if (!riderIdOrData) return;
    const reqId = ++latestRequest.current;
    setLoading(true);
    setError("");

    simulate(riderIdOrData, skipDays)
      .then((data) => {
        if (reqId === latestRequest.current) {
          setResult(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (reqId === latestRequest.current) {
          setError("Unable to compute leave simulation. Please check connection.");
          setLoading(false);
        }
      });
  }, [riderIdOrData, skipDays, simulate]);

  // Derived recovery recommendations
  const shortfallAmt = result?.shortfall || 0;
  const lostIncome = (result?.baselineWeekly || 0) - (result?.adjustedWeekly || 0);

  return (
    <div className="leave-planner-page">
      {/* Top Navigation & Breadcrumb */}
      <div className="page-header-row">
        <div>
          <button
            type="button"
            className="btn--back-link"
            onClick={onBackToDashboard}
          >
            ← Back to Overview
          </button>
          <h2 className="page-heading">🏖️ Leave & Income Impact Planner</h2>
          <p className="page-subheading">
            Simulate taking working days off for <strong>{rider?.name || "Rider"}</strong> without jeopardizing your rent and bike EMI.
          </p>
        </div>

        <div className="leave-header-stats">
          <div className="header-stat-box">
            <span className="stat-box-title">Weekly Fixed Liabilities</span>
            <span className="stat-box-num">
              {rupees(((rider?.fixed?.rent || 0) + (rider?.fixed?.emi || 0) + (rider?.fixed?.phone || 0)) * 7 / 30)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Day Picker + Live Impact Cards */}
      <div className="leave-planner-grid">
        {/* Left Column: Interactive Controls */}
        <div className="planner-card controls-card">
          <div className="controls-section-header">
            <h3>1. Select Planned Days Off</h3>
            <span className="badge-days-count">{skipDays} day(s) selected</span>
          </div>

          <p className="planner-instruction">
            Click on the days you want to take off this week, or use the slider below:
          </p>

          {/* Interactive Weekday Buttons */}
          <div className="weekday-selector-grid">
            {DAYS_OF_WEEK.map(({ key, label, short }) => {
              const isSelected = selectedDays.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  className={`weekday-btn ${isSelected ? "weekday-btn--selected" : ""}`}
                  onClick={() => handleToggleDay(key)}
                  aria-pressed={isSelected}
                >
                  <span className="weekday-short">{short}</span>
                  <span className="weekday-status">{isSelected ? "LEAVE" : "WORK"}</span>
                </button>
              );
            })}
          </div>

          {/* Synchronized Slider */}
          <div className="planner-slider-box">
            <div className="slider-label-row">
              <span>Total days off: <strong>{skipDays}</strong> of 7</span>
              <span className="slider-percent">{Math.round((skipDays / 7) * 100)}% of week</span>
            </div>
            <input
              type="range"
              min={0}
              max={7}
              step={1}
              value={skipDays}
              onChange={(e) => handleSliderChange(e.target.value)}
              className="slider"
            />
            <div className="slider-scale">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
                <span key={n} className={n === skipDays ? "active" : ""}>
                  {n}d
                </span>
              ))}
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="quick-presets-row">
            <span className="presets-label">Quick Presets:</span>
            <button
              type="button"
              className="btn--preset"
              onClick={() => { setSelectedDays([]); setSkipDays(0); }}
            >
              Full 7-Day Grind (0d)
            </button>
            <button
              type="button"
              className="btn--preset"
              onClick={() => { setSelectedDays(["sun"]); setSkipDays(1); }}
            >
              1 Day Weekend (1d)
            </button>
            <button
              type="button"
              className="btn--preset"
              onClick={() => { setSelectedDays(["sat", "sun"]); setSkipDays(2); }}
            >
              2 Day Weekend (2d)
            </button>
          </div>
        </div>

        {/* Right Column: Financial Impact Breakdown */}
        <div className="planner-card results-card">
          <div className="controls-section-header">
            <h3>2. Projected Weekly Financial Impact</h3>
            {loading && <span className="planner-loader">Calculating…</span>}
          </div>

          {error && <div className="tab-error">{error}</div>}

          {result && (
            <>
              {/* Primary Comparison Metric Cards */}
              <div className="comparison-metric-grid">
                <div className="metric-card">
                  <span className="metric-label">Normal Full Week</span>
                  <span className="metric-val">{rupees(result.baselineWeekly)}</span>
                  <span className="metric-sub">7 days worked</span>
                </div>

                <div className="metric-card metric-card--adjusted">
                  <span className="metric-label">With {skipDays} Day(s) Off</span>
                  <span className="metric-val">{rupees(result.adjustedWeekly)}</span>
                  <span className="metric-sub">
                    {lostIncome > 0 ? `-${rupees(lostIncome)} drop` : "No reduction"}
                  </span>
                </div>

                <div className={`metric-card ${result.shortfall > 0 ? "metric-card--danger" : "metric-card--safe"}`}>
                  <span className="metric-label">Fixed Liability Shortfall</span>
                  <span className="metric-val">{rupees(result.shortfall)}</span>
                  <span className="metric-sub">
                    {result.shortfall > 0 ? "⚠️ Liabilities uncovered" : "✅ 100% covered"}
                  </span>
                </div>
              </div>

              {/* Danger / Warning Banner */}
              {result.emiAtRisk && (
                <div className="leave-warning-banner" role="alert">
                  <div className="banner-icon">🚨</div>
                  <div>
                    <strong>CRITICAL: Bike / Loan EMI is at Risk!</strong>
                    <p>
                      Taking {skipDays} day(s) off leaves your income below the weekly threshold needed to secure your EMI payment.
                      You are facing an estimated <strong>{rupees(result.shortfall)}</strong> deficit.
                    </p>
                  </div>
                </div>
              )}

              {/* Liability Waterfall Breakdown */}
              <div className="waterfall-breakdown-section">
                <h4>🛡️ Liability Protection Status</h4>
                <div className="waterfall-rows">
                  <div className="waterfall-row">
                    <span className="waterfall-title">🏠 Rent Allocation:</span>
                    <span className="waterfall-status waterfall-status--ok">
                      {result.adjustedWeekly >= ((rider?.fixed?.rent || 0) * 7 / 30) ? "✅ Fully Protected" : "⚠️ Partially Funded"}
                    </span>
                  </div>

                  <div className="waterfall-row">
                    <span className="waterfall-title">🛵 Bike / Loan EMI:</span>
                    <span className={`waterfall-status ${result.emiAtRisk ? "waterfall-status--danger" : "waterfall-status--ok"}`}>
                      {result.emiAtRisk ? "❌ At Risk (Deficit)" : "✅ Protected"}
                    </span>
                  </div>

                  <div className="waterfall-row">
                    <span className="waterfall-title">🛟 Emergency Cushion Impact:</span>
                    <span className="waterfall-status waterfall-status--warn">
                      {result.emergencyImpact > 0 ? `-${rupees(result.emergencyImpact)} buffer reduction` : "Intact"}
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Catch-Up Recovery Advice */}
              <div className="recovery-advice-card">
                <div className="advice-header">
                  <span>💡</span>
                  <strong>AI Leave Recovery Recommendation</strong>
                </div>
                <p className="advice-body">
                  {skipDays === 0
                    ? "Working all 7 days yields maximum cash flow. Consider taking at least 1 rest day to prevent fatigue and vehicle breakdown."
                    : result.emiAtRisk
                    ? `To take these ${skipDays} days off safely, add 1.5 to 2 extra surge hours during dinner shifts (8 PM–11 PM) on your working days to cover the ${rupees(lostIncome)} gap.`
                    : `Taking ${skipDays} day(s) off is completely safe this week! Your rent and EMI are fully ring-fenced with a safe discretionary spend remaining.`
                  }
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
