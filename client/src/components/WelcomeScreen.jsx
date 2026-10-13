// client/src/components/WelcomeScreen.jsx
import { useState } from "react";
import { isFirebaseConfigured, signInWithGoogle } from "../firebase";

export default function WelcomeScreen({ onDemoRiders, onAddYourself }) {
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    setAuthError("");
    setLoading(true);
    try {
      await signInWithGoogle();
      // On success, App.jsx auth listener will automatically transition to dashboard
    } catch (err) {
      console.error("Firebase Sign-in error:", err);
      let friendly = err.message || "Failed to sign in with Google.";

      if (err.code === "auth/configuration-not-found" || err.message?.includes("CONFIGURATION_NOT_FOUND")) {
        friendly = "Firebase Auth setup needed: Google sign-in is not enabled in Firebase Console. Go to Firebase Console → Authentication → Sign-in method → Enable Google.";
      } else if (err.code === "auth/operation-not-allowed") {
        friendly = "Google Sign-In provider is disabled in Firebase Console. Please enable Google under Authentication → Sign-in method.";
      } else if (err.code === "auth/unauthorized-domain") {
        friendly = "Unauthorized domain: In Firebase Console → Authentication → Settings → Authorized domains, ensure 'localhost' is listed.";
      } else if (err.code === "auth/popup-blocked") {
        friendly = "Browser blocked the sign-in popup. Please allow popups for this site or use 'Try demo riders' below.";
      } else if (err.code === "auth/popup-closed-by-user") {
        friendly = "Sign-in popup was closed before completion.";
      }

      setAuthError(friendly);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="welcome-overlay">
      <div className="welcome-card">
        <div className="welcome-logo">P</div>
        <h1 className="welcome-title">PaySmooth</h1>
        <p className="welcome-tagline">Paycheck for people who don't get one</p>

        {authError && (
          <div className="tab-error" style={{ marginBottom: "1.25rem", textAlign: "left", lineHeight: "1.4" }}>
            ⚠️ <strong>Sign-in issue:</strong>
            <p style={{ margin: "4px 0 0" }}>{authError}</p>
          </div>
        )}

        <div className="welcome-actions">
          {isFirebaseConfigured && (
            <button
              type="button"
              className="btn--welcome btn--google"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              {loading ? "Signing in..." : "Continue with Google"}
            </button>
          )}

          <button
            type="button"
            className="btn--welcome btn--demo"
            onClick={onDemoRiders}
          >
            Try demo riders
          </button>

          <button
            type="button"
            className="btn--welcome btn--add"
            onClick={onAddYourself}
          >
            ＋ Add yourself
          </button>
        </div>

        <p className="welcome-note">
          Simulated demo data for Ravi, Priya, Arjun.<br />
          Your data stays in your browser unless you sign in.
        </p>
      </div>
    </div>
  );
}
