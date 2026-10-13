// client/src/components/StabilityGauge.jsx

export default function StabilityGauge({ score = 0, onDownloadReport }) {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  let rating = "Low";
  let ratingClass = "gauge--low";
  let tip = "Tip: Try to avoid consecutive zero-income days and set aside ₹150 daily into your emergency cushion.";

  if (clampedScore >= 71) {
    rating = "High";
    ratingClass = "gauge--high";
    tip = "Tip: Excellent stability! Maintaining your safe daily spend cap keeps your emergency buffer fully protected.";
  } else if (clampedScore >= 41) {
    rating = "Medium";
    ratingClass = "gauge--medium";
    tip = "Tip: Increasing your emergency buffer to cover 1 full week of fixed costs will boost your stability to High.";
  }

  // Calculate arc stroke offset for SVG circle (circumference = 2 * PI * r = 2 * PI * 40 ≈ 251.3)
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  return (
    <div className="stability-gauge-card">
      <div className="gauge-header">
        <div>
          <span className="eyebrow">FINANCIAL HEALTH</span>
          <h3 className="gauge-title">Stability Score</h3>
        </div>
        {onDownloadReport && (
          <button
            type="button"
            className="btn--download-report"
            onClick={onDownloadReport}
            title="Download verified 1-page financial readiness summary"
          >
            📥 Download Report
          </button>
        )}
      </div>

      <div className="gauge-content">
        <div className="gauge-visual">
          <svg className="gauge-svg" width="100" height="100" viewBox="0 0 100 100">
            <circle
              className="gauge-bg-circle"
              cx="50"
              cy="50"
              r={radius}
            />
            <circle
              className={`gauge-progress-circle ${ratingClass}`}
              cx="50"
              cy="50"
              r={radius}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="gauge-score-text">
            <span className="gauge-number">{clampedScore}</span>
            <span className="gauge-max">/100</span>
          </div>
        </div>

        <div className="gauge-details">
          <div className="gauge-badge-row">
            <span className={`gauge-badge ${ratingClass}`}>
              {rating} Stability
            </span>
          </div>
          <p className="gauge-tip">{tip}</p>
        </div>
      </div>
    </div>
  );
}
