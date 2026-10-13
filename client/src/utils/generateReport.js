// client/src/utils/generateReport.js
import { jsPDF } from "jspdf";

/**
 * Generates a clean 1-page financial readiness summary PDF.
 */
export function generateLoanReadinessPdf({ rider, history, forecast, buckets, stabilityScore }) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Colors
  const darkNavy = [7, 17, 31];
  const primaryGreen = [5, 150, 105];
  const textDark = [30, 41, 59];
  const textMuted = [100, 116, 139];

  // Header banner
  doc.setFillColor(...darkNavy);
  doc.rect(0, 0, pageWidth, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("PaySmooth - Financial Readiness Summary", margin, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("Income Smoothing & Cash Flow Analysis for Gig Workers", margin, 26);

  // Rider Information Box
  let y = 46;
  doc.setTextColor(...textDark);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Worker Profile", margin, y);

  y += 7;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 22, 2, 2, "FD");

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textMuted);
  doc.text("Name:", margin + 5, y + 8);
  doc.text("Platform:", margin + 70, y + 8);
  doc.text("City:", margin + 120, y + 8);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textDark);
  doc.text(rider?.name || "Rider", margin + 20, y + 8);
  doc.text(rider?.platform || "Gig Delivery", margin + 90, y + 8);
  doc.text(rider?.city || "India", margin + 132, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textMuted);
  doc.text("Report Date:", margin + 5, y + 16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textDark);
  doc.text(new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }), margin + 30, y + 16);

  // Metrics Grid
  y += 32;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textDark);
  doc.text("Key Income & Stability Metrics", margin, y);

  y += 6;
  // Calculate historical weekly avg & volatility
  const amounts = (history || []).map(h => h.amount);
  const totalIncome = amounts.reduce((a, b) => a + b, 0);
  const avgDaily = amounts.length ? totalIncome / amounts.length : 0;
  const avgWeekly = Math.round(avgDaily * 7);

  // Volatility = std dev / mean
  const mean = avgDaily;
  const std = Math.sqrt(amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / (amounts.length || 1));
  const volatilityPct = mean > 0 ? Math.round((std / mean) * 100) : 0;

  const forecastTotal = (forecast || []).reduce((s, f) => s + (f.predicted || 0), 0);

  // Draw 4 Metric Cards
  const cardW = (pageWidth - 2 * margin - 15) / 4;
  const metrics = [
    { title: "Stability Score", val: `${Math.round(stabilityScore || 0)}/100`, highlight: true },
    { title: "Avg Weekly Income", val: `INR ${avgWeekly.toLocaleString("en-IN")}` },
    { title: "Forecast (7-Day)", val: `INR ${forecastTotal.toLocaleString("en-IN")}` },
    { title: "Daily Volatility", val: `${volatilityPct}%` }
  ];

  metrics.forEach((m, idx) => {
    const x = margin + idx * (cardW + 5);
    doc.setFillColor(m.highlight ? 240 : 248, m.highlight ? 253 : 250, m.highlight ? 244 : 252);
    doc.setDrawColor(m.highlight ? primaryGreen[0] : 226, m.highlight ? primaryGreen[1] : 232, m.highlight ? primaryGreen[2] : 240);
    doc.roundedRect(x, y, cardW, 20, 2, 2, "FD");

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textMuted);
    doc.text(m.title, x + 3, y + 6);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(m.highlight ? primaryGreen[0] : textDark[0], m.highlight ? primaryGreen[1] : textDark[1], m.highlight ? primaryGreen[2] : textDark[2]);
    doc.text(m.val, x + 3, y + 15);
  });

  // Weekly Fixed Liability & Bucket Allocations
  y += 30;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textDark);
  doc.text("Allocated Weekly Buckets", margin, y);

  y += 7;
  const bucketList = [
    { name: "Rent Reserve", amt: buckets?.rent || 0, desc: "Ring-fenced weekly towards monthly rent" },
    { name: "Loan / Bike EMI", amt: buckets?.emi || 0, desc: "Secured weekly allocation to avoid defaults" },
    { name: "Emergency Buffer", amt: buckets?.emergency || 0, desc: "10% rainy day cushion for unforeseen repairs" },
    { name: "Tax Reserve (TDS)", amt: buckets?.tax || 0, desc: "5% provision for compliance & filing" },
    { name: "Spendable Cash", amt: buckets?.spendable || 0, desc: "Discretionary spending after all liabilities" }
  ];

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  bucketList.forEach((b) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textDark);
    doc.text(b.name, margin, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textMuted);
    doc.text(b.desc, margin + 45, y);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryGreen);
    doc.text(`INR ${Number(b.amt).toLocaleString("en-IN")}`, pageWidth - margin - 25, y, { align: "right" });

    y += 7;
  });

  // Disclaimer & Guarantee
  y = 265;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);

  y += 6;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textMuted);
  doc.text(
    "Self-generated estimate based on user-provided data. Not a credit score.",
    margin,
    y
  );

  doc.text(
    "PaySmooth does not provide lending, investment, or banking services.",
    margin,
    y + 5
  );

  // Save the PDF
  const filename = `${(rider?.name || "rider").toLowerCase().replace(/\s+/g, "_")}_paysmooth_report.pdf`;
  doc.save(filename);
}
