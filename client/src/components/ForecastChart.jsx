// client/src/components/ForecastChart.jsx
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

const HISTORY_DAYS = 30; // how much past to show next to the forecast
const COLORS = { actual: "#1f2937", predicted: "#2563eb", band: "#93c5fd" };

const rupees = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;

// "2025-03-14" -> "14 Mar" (UTC so the label never shifts with timezone)
const shortDate = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

// Merge history and forecast into one series keyed by date
function buildData(history, forecast) {
  const past = history
    .slice(-HISTORY_DAYS)
    .map((d) => ({ date: d.date, actual: d.amount }));

  // Start the forecast line from the last real point so the lines join
  if (past.length) past[past.length - 1].predicted = past[past.length - 1].actual;

  const future = forecast.map((d) => ({
    date: d.date,
    predicted: d.predicted,
    band: [d.low, d.high],
  }));

  return [...past, ...future];
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const isForecast = Array.isArray(row.band);

  return (
    <div className="chart-tooltip">
      <strong>{shortDate(row.date)}</strong>
      {isForecast ? (
        <>
          <div>Expected: {rupees(row.predicted)}</div>
          <div className="chart-tooltip-range">
            Range: {rupees(row.band[0])} – {rupees(row.band[1])}
          </div>
        </>
      ) : (
        <div>Earned: {rupees(row.actual)}</div>
      )}
    </div>
  );
}

// Past payouts as a line, next 7 days as a dashed line with a low/high band
export default function ForecastChart({ history, forecast }) {
  const data = buildData(history, forecast);

  return (
    <section className="card forecast-chart">
      <h2 className="card-title">Daily earnings & 7-day forecast</h2>

      <div className="chart-legend">
        <span><i className="legend-dot legend-dot--actual" /> Earned</span>
        <span><i className="legend-dot legend-dot--predicted" /> Forecast</span>
        <span><i className="legend-dot legend-dot--band" /> Likely range</span>
      </div>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              minTickGap={24}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tickFormatter={(v) => `₹${v}`}
              width={56}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<ChartTooltip />} />

            {forecast.length > 0 && (
              <ReferenceLine x={forecast[0].date} stroke="#9ca3af" strokeDasharray="4 4" />
            )}

            <Area
              dataKey="band"
              stroke="none"
              fill={COLORS.band}
              fillOpacity={0.4}
              isAnimationActive={false}
              connectNulls={false}
            />
            <Line
              dataKey="actual"
              stroke={COLORS.actual}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            <Line
              dataKey="predicted"
              stroke={COLORS.predicted}
              strokeWidth={2.5}
              strokeDasharray="6 4"
              dot={false}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}