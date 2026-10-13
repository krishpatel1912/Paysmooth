// client/src/components/OnboardingModal.jsx
import { useState } from "react";
import { extractEarnings } from "../api";

export default function OnboardingModal({ isOpen, onClose, onSave }) {
  const [step, setStep] = useState(1);

  // Step 1: Profile
  const [name, setName] = useState("");
  const [city, setCity] = useState("Mumbai");
  const [platform, setPlatform] = useState("Swiggy");
  const [language, setLanguage] = useState("en");

  // Step 2: Fixed costs
  const [rent, setRent] = useState("5000");
  const [emi, setEmi] = useState("2500");
  const [phone, setPhone] = useState("499");

  // Step 3: Income data
  const [activeTab, setActiveTab] = useState("csv"); // 'csv' | 'manual' | 'screenshot'
  const [payouts, setPayouts] = useState([]);
  const [csvError, setCsvError] = useState("");
  const [screenshotError, setScreenshotError] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [generalError, setGeneralError] = useState("");

  if (!isOpen) return null;

  // ── CSV Helpers ──────────────────────────────────────────────────────────
  function handleDownloadSampleCsv() {
    const rows = [
      "date,amount",
      ...Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        const iso = d.toISOString().slice(0, 10);
        const amt = 500 + ((i * 37) % 400);
        return `${iso},${amt}`;
      })
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_earnings.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCsvFile(e) {
    setCsvError("");
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result || "";
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) {
          throw new Error("CSV file is empty or missing headers");
        }

        const parsed = [];
        // Skip header if first line contains text like "date" or "amount"
        const startIdx = lines[0].toLowerCase().includes("date") ? 1 : 0;

        for (let i = startIdx; i < lines.length; i++) {
          const parts = lines[i].split(",").map(p => p.trim());
          if (parts.length < 2) continue;
          const [dateStr, amtStr] = parts;
          const amt = Number(amtStr.replace(/[^0-9.]/g, ""));
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) {
            throw new Error(`Row ${i + 1} has an invalid date: "${dateStr}"`);
          }
          if (isNaN(amt) || amt < 0) {
            throw new Error(`Row ${i + 1} has an invalid amount: "${amtStr}"`);
          }
          parsed.push({ date: d.toISOString().slice(0, 10), amount: amt });
        }

        if (parsed.length < 14) {
          throw new Error(`Found only ${parsed.length} days of data. Minimum 14 days required.`);
        }

        parsed.sort((a, b) => a.date.localeCompare(b.date));
        setPayouts(parsed);
      } catch (err) {
        setCsvError(err.message || "Failed to parse CSV file");
      }
    };
    reader.readAsText(file);
  }

  // ── Manual Grid Helpers ──────────────────────────────────────────────────
  function initManualGrid(baseAmt = 650, variance = 150) {
    const list = Array.from({ length: 60 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (59 - i));
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const amt = baseAmt + (isWeekend ? 200 : 0) + ((i * 19) % (variance * 2) - variance);
      return {
        date: d.toISOString().slice(0, 10),
        amount: Math.max(0, amt)
      };
    });
    setPayouts(list);
  }

  function handleManualAmountChange(index, newAmt) {
    const updated = [...payouts];
    updated[index] = { ...updated[index], amount: Math.max(0, Number(newAmt) || 0) };
    setPayouts(updated);
  }

  // ── Screenshot Extraction Helpers ────────────────────────────────────────
  function handleScreenshotFile(e) {
    setScreenshotError("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setScreenshotError("Please select a valid image file (PNG, JPG, WebP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsExtracting(true);
        const dataUrl = event.target?.result;
        const res = await extractEarnings(dataUrl, file.type);
        if (!res.payouts || res.payouts.length === 0) {
          throw new Error("No daily earnings rows detected in image.");
        }
        res.payouts.sort((a, b) => a.date.localeCompare(b.date));
        setPayouts(res.payouts);
      } catch (err) {
        setScreenshotError(
          err.message || "Failed to extract earnings. Please try another image or use CSV upload instead."
        );
      } finally {
        setIsExtracting(false);
      }
    };
    reader.readAsDataURL(file);
  }

  // ── Final Validation & Save ──────────────────────────────────────────────
  function handleSave() {
    setGeneralError("");
    if (!name.trim()) {
      setGeneralError("Please enter your name");
      setStep(1);
      return;
    }

    if (payouts.length < 14) {
      setGeneralError(`You need at least 14 days of payout data (currently have ${payouts.length}).`);
      return;
    }

    const profile = {
      name: name.trim(),
      city: city.trim() || "India",
      platform: platform.trim() || "Delivery",
      language,
      fixed: {
        rent: Math.max(0, Number(rent) || 0),
        emi: Math.max(0, Number(emi) || 0),
        phone: Math.max(0, Number(phone) || 0)
      }
    };

    onSave({ profile, payouts });
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Add Yourself to PaySmooth</h2>
            <p className="modal-subtitle">Step {step} of 3</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Step Tabs Indicator */}
        <div className="step-indicator">
          <div className={`step-dot ${step >= 1 ? "step-dot--active" : ""}`}>1. Profile</div>
          <div className={`step-dot ${step >= 2 ? "step-dot--active" : ""}`}>2. Fixed Costs</div>
          <div className={`step-dot ${step >= 3 ? "step-dot--active" : ""}`}>3. Earnings History</div>
        </div>

        {generalError && (
          <div className="modal-error-banner">{generalError}</div>
        )}

        <div className="modal-body">
          {/* ── STEP 1: Profile ── */}
          {step === 1 && (
            <div className="form-grid">
              <label className="form-label">
                Your Full Name
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Ramesh Patil"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </label>

              <label className="form-label">
                City
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Pune, Bengaluru, Delhi"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </label>

              <label className="form-label">
                Delivery Platform
                <select
                  className="form-input"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                >
                  <option value="Swiggy">Swiggy</option>
                  <option value="Zomato">Zomato</option>
                  <option value="Zepto">Zepto</option>
                  <option value="Blinkit">Blinkit</option>
                  <option value="Uber">Uber</option>
                  <option value="Porter">Porter</option>
                  <option value="Other">Other Gig Platform</option>
                </select>
              </label>

              <label className="form-label">
                AI Coach Preferred Language
                <select
                  className="form-input"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="mr">मराठी (Marathi)</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="en">English</option>
                </select>
              </label>
            </div>
          )}

          {/* ── STEP 2: Monthly Fixed Costs ── */}
          {step === 2 && (
            <div className="form-grid">
              <p className="form-help-text">
                Enter your monthly commitments so PaySmooth can protect them before calculating safe daily spend.
              </p>

              <label className="form-label">
                Monthly Rent (₹)
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={rent}
                  onChange={(e) => setRent(e.target.value)}
                />
              </label>

              <label className="form-label">
                Monthly Bike / Loan EMI (₹)
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={emi}
                  onChange={(e) => setEmi(e.target.value)}
                />
              </label>

              <label className="form-label">
                Monthly Phone & Data Bill (₹)
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
            </div>
          )}

          {/* ── STEP 3: Income Data ── */}
          {step === 3 && (
            <div>
              <div className="income-tabs">
                <button
                  type="button"
                  className={`income-tab-btn ${activeTab === "csv" ? "income-tab-btn--active" : ""}`}
                  onClick={() => setActiveTab("csv")}
                >
                  📄 CSV Upload
                </button>
                <button
                  type="button"
                  className={`income-tab-btn ${activeTab === "manual" ? "income-tab-btn--active" : ""}`}
                  onClick={() => {
                    setActiveTab("manual");
                    if (payouts.length < 14) initManualGrid(600);
                  }}
                >
                  ✏️ Manual 60-Day Grid
                </button>
                <button
                  type="button"
                  className={`income-tab-btn ${activeTab === "screenshot" ? "income-tab-btn--active" : ""}`}
                  onClick={() => setActiveTab("screenshot")}
                >
                  📸 Screenshot (AI Vision)
                </button>
              </div>

              {/* Tab a: CSV Upload */}
              {activeTab === "csv" && (
                <div className="tab-pane">
                  <div className="csv-upload-box">
                    <p>Upload a CSV file containing <strong>date</strong> and <strong>amount</strong> columns.</p>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleCsvFile}
                      className="file-input"
                    />
                    <div className="csv-actions">
                      <button
                        type="button"
                        className="btn--link"
                        onClick={handleDownloadSampleCsv}
                      >
                        ⬇️ Download sample CSV
                      </button>
                    </div>
                  </div>
                  {csvError && <div className="tab-error">{csvError}</div>}
                </div>
              )}

              {/* Tab b: Manual Grid */}
              {activeTab === "manual" && (
                <div className="tab-pane">
                  <div className="quick-fill-bar">
                    <span>Quick Fill:</span>
                    <button type="button" className="btn--pill" onClick={() => initManualGrid(500, 100)}>₹500/day</button>
                    <button type="button" className="btn--pill" onClick={() => initManualGrid(700, 150)}>₹700/day</button>
                    <button type="button" className="btn--pill" onClick={() => initManualGrid(900, 200)}>₹900/day</button>
                  </div>
                  <p className="tab-hint">Scroll down to inspect or tweak any daily payout:</p>
                </div>
              )}

              {/* Tab c: Screenshot Upload */}
              {activeTab === "screenshot" && (
                <div className="tab-pane">
                  <div className="screenshot-upload-box">
                    <p>Upload a screenshot of your app's earnings/payouts page.</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotFile}
                      className="file-input"
                      disabled={isExtracting}
                    />
                    {isExtracting && (
                      <div className="extracting-status">
                        <span className="spinner"></span>
                        Gemini Vision is analyzing daily payouts...
                      </div>
                    )}
                  </div>
                  {screenshotError && (
                    <div className="tab-error">
                      ⚠️ {screenshotError}
                      <p style={{ marginTop: "4px" }}>Tip: You can use the <strong>CSV Upload</strong> or <strong>Manual Grid</strong> tab instead.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Preview table of current payouts */}
              {payouts.length > 0 && (
                <div className="payouts-preview-section">
                  <div className="preview-header">
                    <strong>Loaded Payouts ({payouts.length} days)</strong>
                    <span className="preview-note">Review or edit values before saving:</span>
                  </div>
                  <div className="table-scroll-container">
                    <table className="payouts-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Date</th>
                          <th>Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payouts.map((row, idx) => (
                          <tr key={row.date || idx}>
                            <td>{idx + 1}</td>
                            <td>{row.date}</td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                className="table-input"
                                value={row.amount}
                                onChange={(e) => handleManualAmountChange(idx, e.target.value)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Navigation Footer */}
        <div className="modal-footer">
          {step > 1 && (
            <button
              type="button"
              className="btn--modal-back"
              onClick={() => setStep(step - 1)}
            >
              ← Back
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              className="btn--modal-next"
              onClick={() => {
                if (step === 1 && !name.trim()) {
                  setGeneralError("Please enter your name");
                  return;
                }
                setGeneralError("");
                setStep(step + 1);
              }}
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              className="btn--modal-save"
              onClick={handleSave}
              disabled={payouts.length < 14 || isExtracting}
            >
              {payouts.length < 14
                ? `Need at least 14 days (${payouts.length}/14)`
                : "Save & View Dashboard"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
