// client/src/components/AccountAggregatorModal.jsx
import { useState } from "react";

const SUPPORTED_BANKS = [
  { id: "sbi", name: "State Bank of India (SBI)", icon: "🏛️", accountMask: "XX4912" },
  { id: "hdfc", name: "HDFC Bank", icon: "🏢", accountMask: "XX7104" },
  { id: "icici", name: "ICICI Bank", icon: "🏦", accountMask: "XX3389" },
  { id: "bob", name: "Bank of Baroda", icon: "🏛️", accountMask: "XX9021" },
  { id: "paytm", name: "Paytm Payments Bank", icon: "📱", accountMask: "XX1854" },
  { id: "kotak", name: "Kotak Mahindra Bank", icon: "🏦", accountMask: "XX6240" },
];

export default function AccountAggregatorModal({
  isOpen,
  rider,
  onClose,
  onConnectSuccess
}) {
  const [step, setStep] = useState(1); // 1: Select Bank & Phone, 2: OTP, 3: Approve Consent, 4: Success
  const [selectedBank, setSelectedBank] = useState(SUPPORTED_BANKS[0]);
  const [phone, setPhone] = useState("98220 54129");
  const [otp, setOtp] = useState("4821");
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  function handleSendOtp(e) {
    e.preventDefault();
    setStep(2);
  }

  function handleVerifyOtp(e) {
    e.preventDefault();
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setStep(3);
    }, 800);
  }

  function handleApproveConsent() {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setStep(4);
      setTimeout(() => {
        onConnectSuccess({
          bank: selectedBank,
          phone,
          accountNumber: selectedBank.accountMask
        });
      }, 1000);
    }, 1200);
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card aa-modal-card">
        {/* AA Modal Header */}
        <div className="modal-header aa-header">
          <div className="aa-header-branding">
            <span className="aa-rbi-badge">🛡️ RBI Licensed Account Aggregator</span>
            <h2 className="modal-title">Bank UPI Auto-Sync</h2>
            <p className="modal-subtitle">Direct, passwordless bank connection via Open Banking</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body aa-body">
          {/* ── STEP 1: Bank & Phone ── */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="form-grid">
              <div className="aa-intro-box">
                <p>
                  Connect your bank account to automatically import all your <strong>Paytm, PhonePe, and Google Pay</strong> UPI debits without manual data entry.
                </p>
              </div>

              <label className="form-label">
                Select Your Primary Bank Account
                <div className="bank-options-grid">
                  {SUPPORTED_BANKS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      className={`bank-option-btn ${selectedBank.id === b.id ? "bank-option-btn--active" : ""}`}
                      onClick={() => setSelectedBank(b)}
                    >
                      <span className="bank-opt-icon">{b.icon}</span>
                      <span className="bank-opt-name">{b.name}</span>
                    </button>
                  ))}
                </div>
              </label>

              <label className="form-label">
                Mobile Number linked to Bank & UPI
                <input
                  type="tel"
                  required
                  className="form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 98765 43210"
                />
              </label>

              <div className="aa-trust-footer">
                🔒 <strong>100% Encrypted & Read-Only:</strong> We cannot move money, view your PIN, or make debits. Regulated by RBI NBFC-AA Master Directions.
              </div>

              <div className="modal-footer" style={{ padding: "1rem 0 0", margin: "0" }}>
                <button type="button" className="btn--modal-back" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn--modal-save">
                  Request Secure OTP →
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 2: OTP Verification ── */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="form-grid">
              <div className="aa-intro-box">
                <p>
                  An RBI Account Aggregator verification OTP was sent to <strong>+91 {phone}</strong> linked to your <strong>{selectedBank.name}</strong> account.
                </p>
                <span className="otp-hint-badge">Demo Auto-Fill OTP: 4821</span>
              </div>

              <label className="form-label">
                Enter 4-Digit Verification OTP
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  className="form-input otp-input"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="4821"
                />
              </label>

              <div className="modal-footer" style={{ padding: "1rem 0 0", margin: "0" }}>
                <button type="button" className="btn--modal-back" onClick={() => setStep(1)}>
                  ← Change Bank / Phone
                </button>
                <button type="submit" className="btn--modal-save" disabled={isVerifying || !otp}>
                  {isVerifying ? "Verifying OTP…" : "Verify & Discover Accounts →"}
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 3: Consent Artifact Approval ── */}
          {step === 3 && (
            <div className="form-grid">
              <div className="consent-artifact-card">
                <div className="artifact-header">
                  <strong>Consent Request (FIP → PaySmooth)</strong>
                  <span className="artifact-status">Pending Approval</span>
                </div>

                <div className="discovered-account-row">
                  <span className="bank-logo-badge">{selectedBank.icon}</span>
                  <div>
                    <strong>{selectedBank.name}</strong>
                    <p>Savings Account ending in <strong>{selectedBank.accountMask}</strong></p>
                  </div>
                </div>

                <div className="consent-details-list">
                  <div className="consent-detail-item">
                    <span>Purpose of data:</span>
                    <strong>Income Smoothing & UPI Expense Categorization</strong>
                  </div>
                  <div className="consent-detail-item">
                    <span>Data Requested:</span>
                    <strong>Last 30 days UPI debits & merchant records</strong>
                  </div>
                  <div className="consent-detail-item">
                    <span>Access Mode:</span>
                    <strong>One-time fetch (Read-Only)</strong>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: "1rem 0 0", margin: "0" }}>
                <button type="button" className="btn--modal-back" onClick={() => setStep(2)}>
                  Back
                </button>
                <button
                  type="button"
                  className="btn--modal-save btn--approve-consent"
                  onClick={handleApproveConsent}
                  disabled={isVerifying}
                >
                  {isVerifying ? "Streaming Bank Data…" : "Approve & Auto-Import UPI Debits"}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Success Animation ── */}
          {step === 4 && (
            <div className="aa-success-view">
              <div className="success-icon-bubble">✅</div>
              <h3>Bank UPI Account Synced!</h3>
              <p>
                Successfully connected to <strong>{selectedBank.name} ({selectedBank.accountMask})</strong>.
                All 30-day UPI payments (Paytm, GPay, PhonePe) have been streamed into your dashboard.
              </p>
              <div className="spinner" style={{ margin: "1rem auto 0" }}></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
