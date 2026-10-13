# PaySmooth System Architecture (Phase 1, 2 & 3)

## 🏗️ Core Architecture Overview

PaySmooth is an income-smoothing and financial health platform designed for Indian gig delivery partners (Swiggy, Zomato, Zepto, Blinkit, etc.).

```
┌────────────────────────────────────────────────────────┐
│                   React + Vite Client                  │
│  - Top Tabbed Navigation (Overview, Leave, UPI)        │
│  - Welcome Screen & Guest / Firebase Auth Mode         │
│  - Dedicated Leave & Income Simulator Page             │
│  - Dedicated UPI Spend Tracker & Leakage Detector      │
│  - 3-Step Onboarding Modal (CSV, Grid, Screenshot)     │
│  - Interactive Dashboard (Recharts + SVG Gauge)        │
│  - Multilingual AI / Web Speech Voice Coach            │
│  - 1-Page PDF Loan-Readiness Report (jsPDF)            │
└───────────────▲────────────────────────▲───────────────┘
                │                        │
       REST API │                        │ LocalStorage /
        (Proxy) │                        │ Firestore (users/{uid})
                ▼                        ▼
┌───────────────────────────────┐ ┌──────────────────────┐
│     Node.js + Express API     │ │  Firebase Firestore  │
│   (ES Modules, Port 5000)     │ │  (User Preferences   │
├───────────────────────────────┤ │   & Custom Profiles) │
│ - /api/riders & summary       │ └──────────────────────┘
│ - /api/analyze (inline)       │
│ - /api/simulate (skip days)   │
│ - /api/coach (multilingual)   │
│ - /api/extract-earnings (OCR) │
└───────────────▲───────────────┘
                │
                ▼
┌────────────────────────────────┐
│      Google Gemini API         │
│  (Flash Models: 3.5 / 3.8)     │
│  - Multilingual AI Coach       │
│  - Vision Screenshot Extractor │
└────────────────────────────────┘
```

---

## 📡 API Endpoints

### 1. `GET /api/riders`
Returns list of built-in demo riders (`id`, `name`, `city`, `platform`).

### 2. `GET /api/riders/:id/summary`
Returns full financial profile for a demo rider:
- `rider`: `{ id, name, city, platform, fixed: { rent, emi, phone } }`
- `history`: 60-day historical payouts `[{ date, amount }]`
- `forecast`: 7-day predictive forecast with bounds `[{ date, predicted, low, high }]`
- `buckets`: Weekly ring-fenced buckets `{ rent, emi, tax, emergency, spendable }`
- `safeDailySpend`: Safe discretionary daily spending cap in INR
- `stabilityScore`: Integer 0-100 financial health metric

### 3. `POST /api/analyze`
Accepts custom rider profile and historical payouts:
- **Request Body**: `{ profile: { name, city, platform, language, fixed: { rent, emi, phone } }, payouts: [{ date, amount }] }`
- **Validation**: Enforces ≥14 days of data, non-negative amounts, and ISO dates.
- **Response**: Same shape as `GET /api/riders/:id/summary` plus `stabilityScore`.

### 4. `POST /api/simulate`
Simulates the impact of missed working days on upcoming liabilities:
- **Request Body**: Accepts either `{ riderId, skipDays }` OR inline `{ profile, payouts, skipDays }`.
- **Response**: `{ baselineWeekly, adjustedWeekly, shortfall, emiAtRisk, emergencyImpact }`.

### 5. `POST /api/coach`
Generates actionable, 2-3 sentence financial coaching in the rider's language:
- **Request Body**: Accepts either `{ riderId, language }` OR inline `{ profile, payouts, language }`.
- **Languages**: Marathi (`mr`), Hindi (`hi`), English (`en`).
- **Response**: `{ message: string }`.
- **Fallback**: Returns localized rule-based coaching if offline or quota exceeded.

### 6. `POST /api/extract-earnings`
Extracts daily payout rows from a delivery app screenshot using Gemini Vision:
- **Request Body**: `{ imageBase64, mimeType }`.
- **Response**: `{ payouts: [{ date: "YYYY-MM-DD", amount: number }] }`.

---

## 🧮 Stability Score Formula

The server calculates a 0–100 stability score based on three equally-weighted components:
1. **Coefficient of Variation (CV) Score**: `max(0, 100 - (stdDev / mean * 100))` — measures income consistency; lower day-to-day volatility yields a higher score.
2. **Zero-Day Score**: `(1 - zeroIncomeDayRatio) * 100` — penalizes unpaid or missing working days.
3. **Emergency Buffer Score**: `min(100, (emergencyBucket / weeklyFixedCosts) * 100)` — measures buffer coverage against rent, EMI, and phone liabilities.

Formula: `round((cvScore + zeroScore + bufferScore) / 3)`

---

## 🔒 Storage and Privacy Architecture

1. **Guest Mode (Default)**:
   - All profile data and payout histories remain exclusively inside the user's browser in `localStorage` (`paysmooth_custom_profiles`, `paysmooth_welcome_done`).
   - No data is transmitted to external databases.
2. **Firebase Authenticated Mode (Optional)**:
   - When configured via `VITE_FIREBASE_*`, users can sign in with Google.
   - User profile and preferences sync to Firestore under `users/{uid}`.
   - Security rules restrict read/write access to only the authenticated UID (`request.auth.uid == uid`).
3. **"Delete My Data"**:
   - Clears `localStorage` custom records and issues a delete/clear command to Firestore `users/{uid}`.

---

## 📄 Client Features

- **Welcome Screen**: Clean first-time landing experience with choice memory.
- **Onboarding Modal**: 3-step wizard with CSV upload, 60-day manual editable grid, and Gemini vision screenshot extraction.
- **Interactive Gauges & Charts**: SVG circular stability gauge with Low/Medium/High rating and Recharts forecast visualization.
- **Loan-Readiness PDF Report**: Client-side single-page summary generated via `jsPDF`.
- **Voice Coach**: Browser `SpeechSynthesis` integration supporting `mr-IN`, `hi-IN`, and `en-IN`.