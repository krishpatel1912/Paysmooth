# PaySmooth 🛵
### AI Income-Smoothing App for Indian Gig Workers

PaySmooth helps Swiggy / Zomato / Zepto delivery riders manage income volatility, ring-fence fixed expenses (Rent, EMI), predict weekly earnings, track loan readiness with a Stability Score, and get localized AI coaching in **Marathi, Hindi, and English**.

---

## 🖥️ Running on a New Machine (from ZIP)

### Prerequisites
Install these once — skip if already installed:

| Tool | Version | Download |
|------|---------|----------|
| **Node.js** | v18 or higher | https://nodejs.org |
| **npm** | comes with Node | — |

Check versions with:
```bash
node -v   # should print v18.x or higher
npm -v
```

---

### Step 1 — Unzip & open terminal

Unzip the file and navigate into the project folder:
```bash
cd paysmooth
```

---

### Step 2 — Add environment variables (API keys)

**Backend — create `server/.env`:**

Create a file called `.env` inside the `server/` folder with this content:
```
PORT=5000
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
GEMINI_MODEL=gemini-3.5-flash
```

> Get a free Gemini API key at https://aistudio.google.com/app/apikey  
> If you skip this, the app still works — the AI coach uses built-in localized fallback messages.

**Frontend — create `client/.env`** _(optional, only needed for Google Sign-In & Firestore cloud sync)_:
```
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
```
> If you skip this, the app automatically runs in **Guest Mode** with `localStorage` — all features still work completely.

---

### Step 3 — Generate mock data

Run this **once** from the **project root** (`paysmooth/` folder):
```bash
node scripts/generateData.js
```
This creates `data/riders.json` with 60 days of simulated payout history for 3 demo riders.

---

### Step 4 — Install & start the backend

```bash
cd server
npm install
npm start
```
✅ You should see: `PaySmooth API running on http://127.0.0.1:5000`

---

### Step 5 — Install & start the frontend

Open a **second terminal window** in the project root, then:
```bash
cd client
npm install
npm run dev
```
✅ You should see: `Local: http://localhost:5173/`

---

### Step 6 — Open the app

Open your browser and go to: **http://localhost:5173**

---

## ✨ Features

- **Top Navigation Bar**: Seamless switching between **📊 Overview Dashboard**, **🏖️ Leave Planner**, and **💳 UPI Tracker**.
- **Dedicated Leave & Income Planner**:
  - Full-width interactive planning view (elevated out of the dashboard corner).
  - Weekday selector grid (Mon–Sun toggles) synchronized with 0–7 days off slider.
  - Side-by-side Gross Income vs Adjusted Income comparison.
  - Liability Waterfall Protection Status (Rent, Bike EMI, Emergency Buffer).
  - Smart delivery surge recovery recommendations.
- **UPI Spend Tracker & AI Savings Leakage Detector**:
  - Daily Burn vs Safe Daily Spend progress meter.
  - Category breakdown across Petrol & Bike Care, Tapri Chai & Snacks, Bills, Groceries, and Impulse spending.
  - AI Leakage Detector: concrete rupee insights (e.g. cutting 1 cup of roadside tea/day saves ~₹800/month, covering 35% of monthly bike EMI).
  - Interactive transaction history with category filters and "+ Record UPI Payment" quick logger.
- **Welcome Screen**: Clean landing page on first load with persistence; option to try demo riders, continue with Google, or onboard directly.
- **Onboarding ("Add yourself")**: 3-step wizard supporting:
  - **CSV Upload**: upload custom `date,amount` records with validation and sample CSV download.
  - **Manual 60-Day Grid**: interactive editable daily income grid with quick-fill presets.
  - **AI Screenshot OCR**: upload delivery earnings screenshots extracted via Gemini Vision (`POST /api/extract-earnings`).
- **Stability Score (0–100)**: Proprietary financial health score derived from income coefficient of variation, zero-income day penalty, and emergency buffer coverage.
- **Loan-Readiness PDF Report**: 1-click single-page downloadable summary generated client-side using `jsPDF`.
- **Multilingual AI Coach with Voice**: Actionable financial guidance in Marathi, Hindi, or English, with audio read-aloud via Web Speech synthesis (`mr-IN`, `hi-IN`, `en-IN`).
- **Privacy First & Data Ownership**:
  - Guest mode saves data locally in `localStorage`.
  - Firebase users sync securely under `users/{uid}` in Firestore.
  - "Delete my data" button immediately wipes custom records.

---

## 📁 Project Structure

```
paysmooth/
├── client/                     ← React + Vite frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── firebase.js         ← Firebase auth & Firestore helpers
│   │   ├── styles.css          ← Dark navy + emerald green CSS
│   │   ├── components/
│   │   │   ├── WelcomeScreen.jsx
│   │   │   ├── OnboardingModal.jsx
│   │   │   ├── StabilityGauge.jsx
│   │   │   ├── CoachPanel.jsx  ← Multilingual + Web Speech synthesis
│   │   │   ├── WhatIfSimulator.jsx
│   │   │   ├── BucketCards.jsx
│   │   │   ├── ForecastChart.jsx
│   │   │   └── PersonaSwitcher.jsx
│   │   └── utils/
│   │       └── generateReport.js ← jsPDF 1-page report generator
│   └── .env                    ← Optional Firebase keys
│
├── server/                     ← Node.js + Express backend
│   ├── index.js
│   ├── routes/
│   │   ├── riders.js           ← GET /api/riders & summary
│   │   ├── analyze.js          ← POST /api/analyze (inline custom profiles)
│   │   ├── simulate.js         ← POST /api/simulate (missed days impact)
│   │   ├── coach.js            ← POST /api/coach (multilingual AI coach)
│   │   └── extractEarnings.js  ← POST /api/extract-earnings (Gemini Vision OCR)
│   ├── services/
│   │   ├── forecast.js         ← 7-day WMA predictive model
│   │   ├── buckets.js          ← Rent / EMI / Emergency allocation
│   │   ├── stability.js        ← 0-100 stability score calculation
│   │   └── gemini.js           ← Gemini Flash model integration
│   └── .env                    ← GEMINI_API_KEY & GEMINI_MODEL
│
├── data/
│   ├── riders.json             ← 60-day payout data for demo riders
│   └── samples/
│       ├── sample_earnings.csv ← Sample CSV for testing
│       └── sample_screenshot.png ← Sample earnings screenshot for Vision OCR
│
└── scripts/
    ├── generateData.js         ← Mock data generator
    └── testBrowser.js          ← Full automated headless Chrome test suite
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Recharts, jsPDF, Custom CSS |
| Backend | Node.js, Express (ES Modules) |
| AI Integration | Google Gemini Flash Models (`@google/generative-ai`) |
| Speech | Web Speech API (`SpeechSynthesisUtterance`) |
| Storage & Auth | LocalStorage (Guests) / Firebase Auth & Firestore (Signed In) |

---

## 📡 API Contract

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/riders` | List built-in demo riders |
| `GET` | `/api/riders/:id/summary` | History, 7-day forecast, buckets, safe daily spend, stability score |
| `POST` | `/api/analyze` | Accepts `{ profile, payouts }` -> summary + stability score |
| `POST` | `/api/simulate` | Missed day impact: `{ riderId, skipDays }` OR `{ profile, payouts, skipDays }` |
| `POST` | `/api/coach` | Localized coaching: `{ riderId, language }` OR `{ profile, payouts, language }` |
| `POST` | `/api/extract-earnings` | Gemini Vision OCR: `{ imageBase64, mimeType }` -> `[{ date, amount }]` |

---

## 🧪 Automated Testing

Run the automated Chrome test suite via Chrome DevTools Protocol (CDP):
```bash
node scripts/testBrowser.js
```
Verifies welcome screen, demo personas, what-if slider, coach languages, voice speech button, PDF download, 3-step onboarding, and data deletion with zero console errors.

---

## 📌 Disclaimer

PaySmooth provides cash-flow management, budgeting, and income smoothing tools. It does **not** offer investment, stock market, mutual fund, loan disbursement, or wealth management advice. Self-generated reports are not official credit scores.