// client/src/components/UpiTrackerPage.jsx
import { useState, useMemo } from "react";
import {
  UPI_CATEGORIES,
  generateDefaultUpiTransactions,
  analyzeUpiSpending
} from "../utils/upiData";
import AccountAggregatorModal from "./AccountAggregatorModal";

const STORAGE_KEY = "paysmooth_upi_txns";
const BANK_CONN_KEY = "paysmooth_bank_conn";

const rupees = (n) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;

export default function UpiTrackerPage({
  rider,
  safeDailySpend = 320,
  onBackToDashboard
}) {
  const riderKey = rider?.id || "default";

  // Check if bank is connected via Account Aggregator
  const [bankConnection, setBankConnection] = useState(() => {
    try {
      const saved = localStorage.getItem(`${BANK_CONN_KEY}_${riderKey}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Load transactions from localStorage or generate defaults
  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_${riderKey}`);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return generateDefaultUpiTransactions(rider?.name || "Ravi");
  });

  const [filterCategory, setFilterCategory] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAaModal, setShowAaModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Form state for adding an expense
  const [newMerchant, setNewMerchant] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState("chai_food");
  const [newNotes, setNewNotes] = useState("");

  // Persist transactions helper
  function saveTransactions(updated) {
    setTransactions(updated);
    try {
      localStorage.setItem(`${STORAGE_KEY}_${riderKey}`, JSON.stringify(updated));
    } catch (err) {
      console.warn("Could not save UPI transactions to localStorage:", err);
    }
  }

  // Handle successful bank connection via Account Aggregator
  function handleConnectBankSuccess(info) {
    const updatedConn = {
      bankName: info.bank.name,
      accountMask: info.accountNumber,
      phone: info.phone,
      syncedAt: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    };
    setBankConnection(updatedConn);
    localStorage.setItem(`${BANK_CONN_KEY}_${riderKey}`, JSON.stringify(updatedConn));

    // Refresh transactions with a fresh 30-day feed
    const freshTransactions = generateDefaultUpiTransactions(rider?.name || "Ravi");
    saveTransactions(freshTransactions);
    setShowAaModal(false);
  }

  // Disconnect Bank Sync
  function handleDisconnectBank() {
    if (window.confirm("Disconnect bank sync? You can reconnect anytime.")) {
      setBankConnection(null);
      localStorage.removeItem(`${BANK_CONN_KEY}_${riderKey}`);
    }
  }

  // Sync Now button
  function handleSyncNow() {
    setIsSyncing(true);
    setTimeout(() => {
      const freshTransactions = generateDefaultUpiTransactions(rider?.name || "Ravi");
      saveTransactions(freshTransactions);
      setBankConnection((prev) => ({
        ...prev,
        syncedAt: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      }));
      setIsSyncing(false);
    }, 1000);
  }

  // Handle adding expense manually
  function handleAddExpense(e) {
    e.preventDefault();
    if (!newMerchant.trim() || !newAmount || Number(newAmount) <= 0) return;

    const newTx = {
      id: `upi-custom-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      merchant: newMerchant.trim(),
      category: newCategory,
      amount: Number(newAmount),
      vpa: `${newMerchant.toLowerCase().replace(/\s+/g, '')}@upi`,
      notes: newNotes.trim() || "Manual UPI entry"
    };

    saveTransactions([newTx, ...transactions]);
    setNewMerchant("");
    setNewAmount("");
    setNewNotes("");
    setShowAddModal(false);
  }

  // Handle deleting expense
  function handleDeleteExpense(id) {
    saveTransactions(transactions.filter((tx) => tx.id !== id));
  }

  // Calculate analytics
  const analytics = useMemo(() => {
    return analyzeUpiSpending(transactions, rider?.fixed || { rent: 0, emi: 0, phone: 0 });
  }, [transactions, rider]);

  // Filtered transaction list
  const filteredList = useMemo(() => {
    if (filterCategory === "all") return transactions;
    return transactions.filter((tx) => tx.category === filterCategory);
  }, [transactions, filterCategory]);

  // Daily budget tracking
  const todaySpent = analytics.todaySpent || 0;
  const safeSpendLimit = Math.max(1, safeDailySpend);
  const dailyBurnPct = Math.min(100, Math.round((todaySpent / safeSpendLimit) * 100));
  const isOverBudget = todaySpent > safeSpendLimit;

  return (
    <div className="upi-tracker-page">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <button
            type="button"
            className="btn--back-link"
            onClick={onBackToDashboard}
          >
            ← Back to Overview
          </button>
          <h2 className="page-heading">💳 UPI Spend Tracker & Leakage Detector</h2>
          <p className="page-subheading">
            Track daily micro-UPI payments for <strong>{rider?.name || "Rider"}</strong> and uncover hidden cash leaks that drain your monthly income.
          </p>
        </div>

        <div className="header-action-buttons">
          {bankConnection ? (
            <div className="bank-connected-badge-row">
              <span className="live-pulse-dot"></span>
              <span className="bank-status-text">
                Synced: <strong>{bankConnection.bankName} ({bankConnection.accountMask})</strong>
              </span>
              <button
                type="button"
                className="btn--sync-now"
                onClick={handleSyncNow}
                disabled={isSyncing}
                title="Fetch latest UPI payments from bank"
              >
                {isSyncing ? "Syncing…" : "🔄 Sync Now"}
              </button>
              <button
                type="button"
                className="btn--disconnect"
                onClick={handleDisconnectBank}
                title="Disconnect bank account"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn--connect-bank-aa"
              onClick={() => setShowAaModal(true)}
              title="Automatically connect Paytm, PhonePe and GPay via RBI Account Aggregator"
            >
              ⚡ Connect Bank UPI (Auto-Sync)
            </button>
          )}

          <button
            type="button"
            className="btn--add-expense"
            onClick={() => setShowAddModal(true)}
          >
            ＋ Add Entry
          </button>
        </div>
      </div>

      {/* Top Banner: Today's Burn vs Safe Daily Spend Limit */}
      <div className="upi-daily-meter-card">
        <div className="meter-header">
          <div>
            <span className="eyebrow">TODAY'S DISCRETIONARY BUDGET</span>
            <h3>Today's UPI Outflow vs Safe Limit</h3>
          </div>
          <div className="meter-numbers">
            <span className={`meter-spent ${isOverBudget ? "meter-spent--over" : ""}`}>
              {rupees(todaySpent)}
            </span>
            <span className="meter-limit">/ {rupees(safeSpendLimit)} limit</span>
          </div>
        </div>

        <div className="meter-bar-container">
          <div
            className={`meter-bar-fill ${isOverBudget ? "meter-bar-fill--danger" : ""}`}
            style={{ width: `${dailyBurnPct}%` }}
          ></div>
        </div>

        <div className="meter-footer-note">
          {isOverBudget ? (
            <span className="note-alert">
              ⚠️ Today's UPI spending exceeds your calculated safe limit by {rupees(todaySpent - safeSpendLimit)}. This will cut into your weekly emergency savings.
            </span>
          ) : (
            <span className="note-safe">
              ✅ You still have {rupees(safeSpendLimit - todaySpent)} safe discretionary cash available today.
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: Category Breakdown + AI Leakage Insights */}
      <div className="upi-content-grid">
        {/* Left Card: Category Breakdown */}
        <div className="planner-card upi-categories-card">
          <div className="controls-section-header">
            <h3>Monthly Spending by Category</h3>
            <span className="badge-total-spend">Total: {rupees(analytics.totalSpent)}</span>
          </div>

          <p className="planner-instruction">
            Where your delivery income was spent across 30 days of UPI payments:
          </p>

          <div className="category-bars-list">
            {analytics.categoryList.map((cat) => (
              <div key={cat.key} className="category-bar-row">
                <div className="cat-row-info">
                  <span className="cat-icon">{cat.icon}</span>
                  <span className="cat-name">{cat.label}</span>
                  <span className="cat-amount">{rupees(cat.total)}</span>
                  <span className="cat-percent">{cat.percentage}%</span>
                </div>
                <div className="cat-track">
                  <div
                    className="cat-fill"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: cat.color
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Card: AI Savings Leakage Detector */}
        <div className="planner-card upi-leaks-card">
          <div className="controls-section-header">
            <h3>🤖 AI Leakage Detector & Savings Tips</h3>
            <span className="badge-savings-count">{analytics.insights.length} opportunities</span>
          </div>

          <p className="planner-instruction">
            Smart algorithmic insights into where small daily leaks can be converted into EMI protection:
          </p>

          <div className="insights-container">
            {analytics.insights.map((insight) => (
              <div key={insight.id} className={`insight-card insight-card--${insight.severity}`}>
                <div className="insight-top">
                  <span className="insight-icon">{insight.icon}</span>
                  <strong className="insight-title">{insight.title}</strong>
                  <span className="insight-savings-tag">
                    Save ~{rupees(insight.savingsPotential)}/mo
                  </span>
                </div>
                <p className="insight-message">{insight.message}</p>
                <div className="insight-action">
                  <strong>💡 Pro-Action:</strong> {insight.actionTip}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="planner-card upi-transactions-card">
        <div className="transactions-header-row">
          <div>
            <h3>
              {bankConnection ? `Bank Verified UPI Stream (${filteredList.length})` : `Recent UPI Payments (${filteredList.length})`}
            </h3>
            <p className="subtext">
              {bankConnection
                ? `Directly synced from ${bankConnection.bankName} (${bankConnection.accountMask}) via RBI Account Aggregator`
                : "QR scans, fuel pumps, and tea tapri payments"}
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="filter-pills-row">
            <button
              type="button"
              className={`filter-pill ${filterCategory === "all" ? "filter-pill--active" : ""}`}
              onClick={() => setFilterCategory("all")}
            >
              All
            </button>
            {Object.values(UPI_CATEGORIES).map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`filter-pill ${filterCategory === cat.id ? "filter-pill--active" : ""}`}
                onClick={() => setFilterCategory(cat.id)}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="transactions-table-wrap">
          <table className="upi-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Merchant / VPA</th>
                <th>Category</th>
                <th>Notes</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((tx) => {
                const catMeta = UPI_CATEGORIES[tx.category?.toUpperCase()] || UPI_CATEGORIES.MISC;
                return (
                  <tr key={tx.id}>
                    <td className="tx-date">{tx.date}</td>
                    <td className="tx-merchant">
                      <strong>{tx.merchant}</strong>
                      <span className="tx-vpa">{tx.vpa}</span>
                    </td>
                    <td>
                      <span className="tx-cat-badge" style={{ borderColor: catMeta.color }}>
                        {catMeta.icon} {catMeta.label}
                      </span>
                    </td>
                    <td className="tx-notes">{tx.notes}</td>
                    <td className="tx-amount" style={{ textAlign: "right" }}>
                      -{rupees(tx.amount)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="btn--del-tx"
                        onClick={() => handleDeleteExpense(tx.id)}
                        title="Delete entry"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Account Aggregator Modal */}
      <AccountAggregatorModal
        isOpen={showAaModal}
        rider={rider}
        onClose={() => setShowAaModal(false)}
        onConnectSuccess={handleConnectBankSuccess}
      />

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card" style={{ maxWidth: "480px" }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Record UPI Outflow</h2>
                <p className="modal-subtitle">Log a cash outflow or QR transaction</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="modal-body form-grid">
              <label className="form-label">
                Merchant / Vendor Name
                <input
                  type="text"
                  required
                  placeholder="e.g. Chai Tapri, Petrol Pump, Kirana"
                  className="form-input"
                  value={newMerchant}
                  onChange={(e) => setNewMerchant(e.target.value)}
                  autoFocus
                />
              </label>

              <label className="form-label">
                Amount Paid (₹)
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 150"
                  className="form-input"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                />
              </label>

              <label className="form-label">
                Category
                <select
                  className="form-input"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                >
                  {Object.values(UPI_CATEGORIES).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-label">
                Notes (Optional)
                <input
                  type="text"
                  placeholder="e.g. 2 teas + evening snack"
                  className="form-input"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                />
              </label>

              <div className="modal-footer" style={{ padding: "1rem 0 0", margin: "0" }}>
                <button
                  type="button"
                  className="btn--modal-back"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn--modal-save">
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
