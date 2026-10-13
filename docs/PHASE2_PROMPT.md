# PaySmooth Phase 2 (follow in order)

You are continuing work on PaySmooth, which already runs end to end. Do NOT rewrite from scratch. Reuse forecast.js, buckets.js, gemini.js and all current endpoints, which must keep working unchanged. Keep GEMINI_MODEL read from server/.env, keep the static fallbacks, and keep the app fully working in guest mode. Firebase config already exists in client/.env (VITE_FIREBASE_*); do not overwrite or print it. No investment advice and no real credit-score claims anywhere.

After each task: run it, fix errors, post a one-line status, then continue. Be economical: don't re-read unchanged files and batch related fixes.

TASK 1 - Backend inline profiles
- Add POST /api/analyze {profile, payouts}. profile = {name, city, platform, language, fixed:{rent,emi,phone}}, payouts = [{date,amount}]. Return the same shape as GET /api/riders/:id/summary plus stabilityScore.
- Let POST /api/simulate and POST /api/coach accept either riderId or an inline {profile, payouts}.
- Validate: at least 14 days of data, non-negative numeric amounts, valid dates. Treat missing days in the range as 0. Return clear 400 errors.

TASK 2 - Welcome screen
- Show on first load: PaySmooth name, tagline "Paycheck for people who don't get one", and buttons: "Continue with Google" (only if Firebase is configured), "Try demo riders" (straight to dashboard as guest), "Add yourself" (opens onboarding).
- Remember the choice in localStorage so returning users skip it. Add a "Switch account / Sign out" option in the header.
- A signed-in returning user has saved profiles loaded from Firestore automatically.

TASK 3 - Onboarding ("Add yourself")
- 3-step modal: (1) name, city, platform, language (mr/hi/en); (2) monthly fixed costs: rent, EMI, phone; (3) income data.
- Income data tabs: a) CSV upload (date,amount) with a "Download sample CSV" link and validation messages; b) manual 60-day editable grid with quick fill; c) screenshot upload sent to a new POST /api/extract-earnings that uses Gemini vision (same GEMINI_MODEL) and returns [{date,amount}] JSON. Show extracted rows in an editable table; the user MUST confirm or edit before saving. On failure show a friendly error and suggest CSV.
- After saving, the new user appears as a persona button and the dashboard works through /api/analyze.

TASK 4 - Storage and privacy
- Guests: localStorage. Signed in with Firebase: also sync profiles to Firestore under users/{uid} (rules only allow a user to access their own document).
- "Delete my data" button clearing localStorage and Firestore after a confirm dialog.
- Small label: "Simulated demo data for Ravi, Priya, Arjun. Your data stays in your browser unless you sign in."

TASK 5 - Stability Score
- Server-side 0-100 from coefficient of variation of daily income, zero-income day ratio, and buffer coverage (emergency bucket vs weekly fixed costs). Document the formula in 3 comment lines.
- Dashboard gauge with Low / Medium / High label and one improvement tip from the coach (static fallback).

TASK 6 - Loan-readiness report (PDF)
- "Download report" button: one-page PDF generated client-side (jsPDF): name, average weekly income, volatility, stability score, 7-day forecast, weekly buckets, emergency buffer.
- Footer: "Self-generated estimate based on user-provided data. Not a credit score."

TASK 7 - Voice coach
- "Listen" button using browser SpeechSynthesis with mr-IN / hi-IN / en-IN by selected language. Hide it if no matching voice exists.

TASK 8 - Polish
- Loading, empty and error states for every new feature. Keep the dark navy and green theme. Modal, gauge and welcome screen mobile responsive. Animate the gauge.

TASK 9 - Test with browser agent / scripts/testBrowser.js
- Create a new user via CSV, manual grid, and screenshot (generate a sample CSV and a fake screenshot with made-up numbers and no real company branding in data/samples/).
- Verify dashboard, simulator, coach in all 3 languages, voice button, PDF download, stability score, delete data, and the welcome screen in guest mode. Confirm existing riders and endpoints behave as before and the console has zero errors.
- Google sign-in cannot be fully automated: just confirm the button appears and nothing crashes, and list it as a manual test for me.

TASK 10 - Docs and report
- Update README.md and docs/ARCHITECTURE.md with new endpoints, onboarding flow, Firebase and privacy notes. Update .env.example files if needed.
- Final report: every file changed and why, plus manual steps I must do.
