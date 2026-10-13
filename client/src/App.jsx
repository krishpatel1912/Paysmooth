import { useEffect, useState } from "react";
import { getRiders, getSummary, analyze, simulate, getCoach } from "./api";
import {
  isFirebaseConfigured,
  subscribeToAuth,
  signInWithGoogle,
  logOut,
  loadUserPreferences,
  saveUserPreferences,
  deleteUserData
} from "./firebase";

import PersonaSwitcher from "./components/PersonaSwitcher";
import ForecastChart from "./components/ForecastChart";
import BucketCards from "./components/BucketCards";
import CoachPanel from "./components/CoachPanel";
import WelcomeScreen from "./components/WelcomeScreen";
import OnboardingModal from "./components/OnboardingModal";
import StabilityGauge from "./components/StabilityGauge";
import LeavePlannerPage from "./components/LeavePlannerPage";
import UpiTrackerPage from "./components/UpiTrackerPage";
import { generateLoanReadinessPdf } from "./utils/generateReport";

const WELCOME_KEY = "paysmooth_welcome_done";
const CUSTOM_PROFILES_KEY = "paysmooth_custom_profiles";

export default function App() {
  const [riders, setRiders] = useState([]);
  const [selectedRiderId, setSelectedRiderId] = useState("");
  const [userSelectedLanguage, setUserSelectedLanguage] = useState("");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  // Active top navigation tab: 'overview' | 'leave' | 'upi'
  const [activeTab, setActiveTab] = useState("overview");

  // Custom user profile and payouts storage
  const [customProfiles, setCustomProfiles] = useState(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_PROFILES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Welcome screen & Onboarding modal states
  const [showWelcome, setShowWelcome] = useState(
    () => !localStorage.getItem(WELCOME_KEY)
  );
  const [showOnboarding, setShowOnboarding] = useState(false);

  // ─── Auth listener ─────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        localStorage.setItem(WELCOME_KEY, "1");
        setShowWelcome(false);

        const prefs = await loadUserPreferences(currentUser.uid);
        if (prefs) {
          if (prefs.selectedRiderId) setSelectedRiderId(prefs.selectedRiderId);
          if (prefs.language) setUserSelectedLanguage(prefs.language);
          if (prefs.profile && prefs.payouts) {
            const firestoreCustom = {
              id: prefs.profile.id || "custom-user",
              name: prefs.profile.name,
              city: prefs.profile.city,
              platform: prefs.profile.platform,
              language: prefs.profile.language,
              fixed: prefs.profile.fixed,
              payouts: prefs.payouts,
              isCustom: true
            };
            setCustomProfiles((prev) => {
              const filtered = prev.filter((p) => p.id !== firestoreCustom.id);
              const updated = [...filtered, firestoreCustom];
              localStorage.setItem(CUSTOM_PROFILES_KEY, JSON.stringify(updated));
              return updated;
            });
          }
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // ─── Data loading ───────────────────────────────────────────────────────────
  async function loadRiders() {
    try {
      setLoading(true);
      setError("");
      const data = await getRiders();
      const allRiders = [...data, ...customProfiles.map(c => ({
        id: c.id,
        name: c.name,
        city: c.city,
        platform: c.platform,
        isCustom: true
      }))];
      setRiders(allRiders);

      if (!selectedRiderId && allRiders.length > 0) {
        setSelectedRiderId(allRiders[0].id);
      }
    } catch (err) {
      setError(err.message || "Unable to load riders. Please ensure the backend server is running.");
    } finally {
      setLoading(false);
    }
  }

  // Load dashboard: handles both demo riders and custom inline profiles
  async function loadDashboard(id) {
    if (!id) return;
    try {
      setLoading(true);
      setError("");

      const customMatch = customProfiles.find((c) => c.id === id);
      if (customMatch) {
        const profile = {
          name: customMatch.name,
          city: customMatch.city,
          platform: customMatch.platform,
          language: customMatch.language,
          fixed: customMatch.fixed
        };
        const data = await analyze(profile, customMatch.payouts);
        setSummary(data);
      } else {
        const data = await getSummary(id);
        setSummary(data);
      }
    } catch (err) {
      setError(err.message || "Unable to load rider summary. Please check connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!showWelcome) {
      loadRiders();
    }
  }, [customProfiles, showWelcome]);

  useEffect(() => {
    if (selectedRiderId && !showWelcome) {
      loadDashboard(selectedRiderId);
    }
  }, [selectedRiderId, showWelcome]);

  // ─── Welcome screen handlers ────────────────────────────────────────────────
  function handleDemoRiders() {
    localStorage.setItem(WELCOME_KEY, "1");
    setShowWelcome(false);
    loadRiders();
  }

  function handleAddYourself() {
    localStorage.setItem(WELCOME_KEY, "1");
    setShowWelcome(false);
    setShowOnboarding(true);
  }

  // ─── Rider / language handlers ───────────────────────────────────────────────
  function handleSelectRider(id) {
    setSelectedRiderId(id);
    if (user) {
      saveUserPreferences(user.uid, { selectedRiderId: id });
    }
  }

  function handleLanguageChange(lang) {
    setUserSelectedLanguage(lang);
    if (user) {
      saveUserPreferences(user.uid, { language: lang });
    }
  }

  // ─── Onboarding Save Handler ─────────────────────────────────────────────────
  async function handleSaveOnboarding({ profile, payouts }) {
    const customId = `custom-${Date.now()}`;
    const newCustom = {
      id: customId,
      name: profile.name,
      city: profile.city,
      platform: profile.platform,
      language: profile.language || "en",
      fixed: profile.fixed,
      payouts,
      isCustom: true
    };

    const updated = [...customProfiles, newCustom];
    setCustomProfiles(updated);
    localStorage.setItem(CUSTOM_PROFILES_KEY, JSON.stringify(updated));

    if (user) {
      saveUserPreferences(user.uid, {
        selectedRiderId: customId,
        language: profile.language,
        profile: newCustom,
        payouts
      });
    }

    setShowOnboarding(false);
    setSelectedRiderId(customId);
  }

  // ─── Delete Data Handler ─────────────────────────────────────────────────────
  async function handleDeleteData() {
    const confirmed = window.confirm(
      "Are you sure you want to delete your saved profile and earnings data? This will clear your custom data from this browser and Firestore."
    );
    if (!confirmed) return;

    localStorage.removeItem(CUSTOM_PROFILES_KEY);
    setCustomProfiles([]);

    if (user) {
      await deleteUserData(user.uid);
    }

    const demoRider = riders.find((r) => !r.isCustom);
    if (demoRider) {
      setSelectedRiderId(demoRider.id);
    }
  }

  // ─── Derived Selected Rider & Custom Context ─────────────────────────────────
  const selectedCustom = customProfiles.find((c) => c.id === selectedRiderId);
  const selectedRider =
    selectedCustom ||
    riders.find((r) => r.id === selectedRiderId) ||
    summary?.rider;

  const inlinePayload = selectedCustom
    ? {
        profile: {
          name: selectedCustom.name,
          city: selectedCustom.city,
          platform: selectedCustom.platform,
          language: selectedCustom.language,
          fixed: selectedCustom.fixed
        },
        payouts: selectedCustom.payouts
      }
    : null;

  // ─── Render Welcome Screen ───────────────────────────────────────────────────
  if (showWelcome) {
    return (
      <WelcomeScreen
        onDemoRiders={handleDemoRiders}
        onAddYourself={handleAddYourself}
      />
    );
  }

  return (
    <div className="app">
      {/* ── Header with Logo, Navigation Tabs, and Auth ── */}
      <header className="header">
        <div className="brand" onClick={() => setActiveTab("overview")} style={{ cursor: "pointer" }}>
          <div className="logo">P</div>
          <div>
            <h1>PaySmooth</h1>
            <p>Smarter income planning for gig workers</p>
          </div>
        </div>

        {/* ── Top Navigation Tabs ── */}
        <nav className="top-nav" aria-label="Main Navigation">
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === "overview" ? "nav-tab-btn--active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            📊 Overview
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === "leave" ? "nav-tab-btn--active" : ""}`}
            onClick={() => setActiveTab("leave")}
          >
            🏖️ Leave Planner
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === "upi" ? "nav-tab-btn--active" : ""}`}
            onClick={() => setActiveTab("upi")}
          >
            💳 UPI Tracker
          </button>
        </nav>

        {/* ── Header Actions & Profile ── */}
        <div className="header-actions">
          <div className="status">
            <span className="status-dot"></span>
            AI powered
          </div>

          {isFirebaseConfigured ? (
            user ? (
              <div className="auth-profile">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    className="auth-avatar"
                  />
                ) : (
                  <span className="auth-avatar auth-avatar--placeholder">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
                  </span>
                )}
                <span className="auth-name">{user.displayName || user.email}</span>
                <button
                  type="button"
                  className="btn--auth btn--signout"
                  onClick={() => {
                    logOut();
                    localStorage.removeItem(WELCOME_KEY);
                    setShowWelcome(true);
                    setSummary(null);
                    setRiders([]);
                  }}
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn--auth btn--signin"
                onClick={async () => {
                  try {
                    await signInWithGoogle();
                  } catch (err) {
                    console.error("Google sign in failed:", err);
                    let msg = err.message || "Failed to sign in with Google.";
                    if (err.code === "auth/configuration-not-found" || err.message?.includes("CONFIGURATION_NOT_FOUND")) {
                      msg = "Firebase Auth setup needed: Google sign-in is not enabled in Firebase Console.\n\nGo to Firebase Console → Authentication → Sign-in method → Enable Google.";
                    } else if (err.code === "auth/unauthorized-domain") {
                      msg = "Unauthorized domain: In Firebase Console → Authentication → Settings → Authorized domains, ensure 'localhost' is listed.";
                    } else if (err.code === "auth/popup-blocked") {
                      msg = "Browser blocked the sign-in popup. Please allow popups for localhost.";
                    }
                    alert(msg);
                  }
                }}
              >
                Sign in with Google
              </button>
            )
          ) : (
            <>
              <span className="guest-badge">Guest mode</span>
              <button
                type="button"
                className="btn--auth btn--signout"
                style={{ marginLeft: "0.5rem" }}
                onClick={() => {
                  localStorage.removeItem(WELCOME_KEY);
                  setShowWelcome(true);
                  setSummary(null);
                  setRiders([]);
                }}
              >
                Switch account
              </button>
            </>
          )}

          {customProfiles.length > 0 && (
            <button
              type="button"
              className="btn--delete-data"
              onClick={handleDeleteData}
              title="Delete all custom stored data"
            >
              🗑️ Delete data
            </button>
          )}
        </div>
      </header>

      <main className="container">
        {/* ── Active Rider Bar (Always Accessible) ── */}
        <section className="persona-section">
          <div>
            <p className="eyebrow">RIDER PROFILE</p>
            <h2>{activeTab === "leave" ? "Leave & Vacation Planner" : activeTab === "upi" ? "UPI Expenses & Leaks" : "Income Overview"}</h2>
          </div>

          <PersonaSwitcher
            riders={riders}
            selectedRiderId={selectedRiderId}
            onChange={handleSelectRider}
            onAddYourself={() => setShowOnboarding(true)}
          />
        </section>

        {error && (
          <div className="error-card" role="alert">
            <div className="error-icon">⚠️</div>
            <div className="error-content">
              <strong>Unable to load dashboard</strong>
              <p>{error}</p>
              <button
                type="button"
                className="btn--retry"
                onClick={() => (selectedRiderId ? loadDashboard(selectedRiderId) : loadRiders())}
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {loading && !summary && (
          <div className="skeleton-dashboard" aria-label="Loading dashboard...">
            <div className="skeleton-hero"></div>
            <div className="skeleton-grid">
              <div className="skeleton-box" style={{ gridColumn: "span 8" }}></div>
              <div className="skeleton-box" style={{ gridColumn: "span 4" }}></div>
              <div className="skeleton-box" style={{ gridColumn: "span 6" }}></div>
              <div className="skeleton-box" style={{ gridColumn: "span 6" }}></div>
            </div>
          </div>
        )}

        {/* ── VIEW 1: OVERVIEW DASHBOARD ── */}
        {summary && activeTab === "overview" && (
          <>
            {/* Top Row: Hero Safe Spend Card + Stability Gauge Card */}
            <div className="dashboard-top-row">
              <section className="hero-card">
                <div>
                  <p className="hero-label">SAFE DAILY SPEND</p>
                  <div className="safe-spend">
                    ₹{Math.round(Number(summary.safeDailySpend || 0)).toLocaleString("en-IN")}
                  </div>
                  <p className="hero-description">
                    You can safely spend this amount today while keeping your important weekly expenses protected.
                  </p>
                </div>

                <div className="rider-summary">
                  <span className="rider-avatar">
                    {selectedRider?.name?.charAt(0) || "R"}
                  </span>
                  <div>
                    <strong>{selectedRider?.name}</strong>
                    <p>{selectedRider?.platform} · {selectedRider?.city}</p>
                  </div>
                </div>
              </section>

              <StabilityGauge
                score={summary.stabilityScore ?? 75}
                onDownloadReport={() =>
                  generateLoanReadinessPdf({
                    rider: selectedRider,
                    history: summary.history,
                    forecast: summary.forecast,
                    buckets: summary.buckets,
                    stabilityScore: summary.stabilityScore ?? 75
                  })
                }
              />
            </div>

            {/* Quick Action Feature Banners (Elevates Leave Planner & UPI Tracker) */}
            <div className="feature-teasers-row">
              <div className="teaser-card teaser-card--leave" onClick={() => setActiveTab("leave")}>
                <div className="teaser-icon">🏖️</div>
                <div className="teaser-body">
                  <strong>Plan Time Off & Vacations</strong>
                  <p>Check if your rent and bike EMI remain safe before skipping delivery shifts.</p>
                </div>
                <button type="button" className="btn--teaser">
                  Open Leave Planner →
                </button>
              </div>

              <div className="teaser-card teaser-card--upi" onClick={() => setActiveTab("upi")}>
                <div className="teaser-icon">💳</div>
                <div className="teaser-body">
                  <strong>UPI Spend & Leakage Tracker</strong>
                  <p>Track roadside tea, fuel & QR payments to uncover hidden monthly savings.</p>
                </div>
                <button type="button" className="btn--teaser">
                  View UPI Leaks →
                </button>
              </div>
            </div>

            {/* Main Grid: Forecast, Buckets, and Coach */}
            <section className="dashboard-grid">
              <div className="dashboard-card forecast-area" style={{ gridColumn: "span 7" }}>
                <ForecastChart
                  history={summary.history}
                  forecast={summary.forecast}
                  rider={selectedRider}
                />
              </div>

              <div className="dashboard-card buckets-area" style={{ gridColumn: "span 5" }}>
                <BucketCards
                  buckets={summary.buckets}
                  safeDailySpend={summary.safeDailySpend}
                />
              </div>

              <div className="dashboard-card coach-area" style={{ gridColumn: "span 12" }}>
                <CoachPanel
                  riderId={inlinePayload || selectedRiderId}
                  language={
                    userSelectedLanguage ||
                    summary.rider?.language ||
                    selectedRider?.language ||
                    "en"
                  }
                  coach={getCoach}
                  onLanguageChange={handleLanguageChange}
                />
              </div>
            </section>

            <p className="demo-note">
              Simulated demo data for Ravi, Priya, Arjun. Your data stays in your browser unless you sign in.
            </p>
          </>
        )}

        {/* ── VIEW 2: DEDICATED LEAVE PLANNER PAGE ── */}
        {activeTab === "leave" && (
          <LeavePlannerPage
            rider={selectedRider}
            riderIdOrData={inlinePayload || selectedRiderId}
            simulate={simulate}
            onBackToDashboard={() => setActiveTab("overview")}
          />
        )}

        {/* ── VIEW 3: DEDICATED UPI SPEND TRACKER PAGE ── */}
        {activeTab === "upi" && (
          <UpiTrackerPage
            rider={selectedRider}
            safeDailySpend={summary?.safeDailySpend || 320}
            onBackToDashboard={() => setActiveTab("overview")}
          />
        )}
      </main>

      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onSave={handleSaveOnboarding}
      />

      <footer>
        PaySmooth · Built to make irregular income easier to plan
      </footer>
    </div>
  );
}