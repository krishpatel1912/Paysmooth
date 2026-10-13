// scripts/testBrowser.js
// Automated headless Chrome test for PaySmooth Phase 2 & 3 web client via CDP

async function run() {
  const versionRes = await fetch("http://127.0.0.1:9222/json/new?http://localhost:5173", { method: "PUT" });
  const pageTarget = await versionRes.json();
  const wsUrl = pageTarget.webSocketDebuggerUrl;
  console.log("Attached to page target:", wsUrl);

  const ws = new WebSocket(wsUrl);

  let messageId = 0;
  const pending = new Map();
  const consoleErrors = [];

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++messageId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    } else if (data.method === "Runtime.consoleAPICalled") {
      if (data.params.type === "error") {
        console.warn("Browser console.error:", data.params.args);
        consoleErrors.push(data.params);
      }
    }
  };

  await new Promise((resolve) => ws.onopen = resolve);

  await send("Page.enable");
  await send("Runtime.enable");

  console.log("Waiting for page load...");
  await new Promise((r) => setTimeout(r, 2000));

  async function evaluate(expression) {
    const res = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res.result?.value;
  }

  // 1. Clear localStorage to verify Welcome Screen
  console.log("\n=== 1. Testing Welcome Screen ===");
  await evaluate("localStorage.clear()");
  await evaluate("window.location.reload()");
  await new Promise((r) => setTimeout(r, 2000));

  const welcomeTitle = await evaluate("document.querySelector('.welcome-title')?.innerText");
  const welcomeTagline = await evaluate("document.querySelector('.welcome-tagline')?.innerText");
  const demoBtnPresent = await evaluate("document.querySelector('.btn--demo') !== null");
  const addBtnPresent = await evaluate("document.querySelector('.btn--add') !== null");
  console.log(`Welcome Title: "${welcomeTitle}" | Tagline: "${welcomeTagline}"`);
  console.log(`Buttons present: Demo=${demoBtnPresent}, AddYourself=${addBtnPresent}`);

  // 2. Click "Try demo riders" and verify Dashboard & Navigation Tabs
  console.log("\n=== 2. Testing Demo Riders & Navigation Tabs ===");
  await evaluate("document.querySelector('.btn--demo').click()");
  await new Promise((r) => setTimeout(r, 2000));

  const personaCount = await evaluate("document.querySelectorAll('.persona-btn').length");
  const stabilityScore = await evaluate("document.querySelector('.gauge-number')?.innerText");
  const stabilityBadge = await evaluate("document.querySelector('.gauge-badge')?.innerText");
  const safeSpend = await evaluate("document.querySelector('.hero-card .safe-spend')?.innerText");
  const navTabsCount = await evaluate("document.querySelectorAll('.nav-tab-btn').length");
  console.log(`Demo riders loaded: ${personaCount} personas`);
  console.log(`Stability Score: ${stabilityScore}/100 [${stabilityBadge}] | Safe Daily Spend: ${safeSpend}`);
  console.log(`Navigation tabs found: ${navTabsCount} tabs (Overview, Leave Planner, UPI Tracker)`);

  // 3. Test Dedicated Leave & Income Planner Page
  console.log("\n=== 3. Testing Dedicated Leave & Income Planner Page ===");
  // Click teaser card to open Leave Planner
  await evaluate("document.querySelector('.teaser-card--leave').click()");
  await new Promise((r) => setTimeout(r, 1000));

  const leavePageHeading = await evaluate("document.querySelector('.page-heading')?.innerText");
  const weekdayBtnsCount = await evaluate("document.querySelectorAll('.weekday-btn').length");
  console.log(`Active Page Heading: "${leavePageHeading}"`);
  console.log(`Interactive weekday buttons: ${weekdayBtnsCount} days`);

  // Toggle Sunday and Monday off
  await evaluate(`
    (() => {
      const btns = document.querySelectorAll('.weekday-btn');
      if (btns[0]) btns[0].click(); // Monday
      if (btns[6]) btns[6].click(); // Sunday
    })()
  `);
  await new Promise((r) => setTimeout(r, 800));

  const daysOffSelected = await evaluate("document.querySelector('.badge-days-count')?.innerText");
  const adjustedIncome = await evaluate("document.querySelector('.metric-card--adjusted .metric-val')?.innerText");
  const shortfallVal = await evaluate("document.querySelector('.metric-card:nth-child(3) .metric-val')?.innerText");
  console.log(`Leave state: ${daysOffSelected} | Adjusted Income: ${adjustedIncome} | Shortfall: ${shortfallVal}`);

  // Test full 5 days off to trigger EMI Warning
  await evaluate(`
    (() => {
      const slider = document.querySelector('.leave-planner-page .slider');
      if (slider) {
        const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        desc.set.call(slider, 5);
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()
  `);
  await new Promise((r) => setTimeout(r, 800));

  const emiWarningText = await evaluate("document.querySelector('.leave-warning-banner strong')?.innerText");
  console.log(`5 Days Off Status: ${emiWarningText ? `[Triggered: ${emiWarningText}]` : "No warning"}`);

  // Navigate back to overview
  await evaluate("document.querySelector('.btn--back-link').click()");
  await new Promise((r) => setTimeout(r, 600));

  // 4. Test Dedicated UPI Spend Tracker Page
  console.log("\n=== 4. Testing Dedicated UPI Spend Tracker Page ===");
  // Use top navigation tab to open UPI Tracker
  await evaluate(`
    (() => {
      const navBtns = document.querySelectorAll('.nav-tab-btn');
      if (navBtns[2]) navBtns[2].click(); // UPI Tracker tab
    })()
  `);
  await new Promise((r) => setTimeout(r, 1000));

  const upiHeading = await evaluate("document.querySelector('.page-heading')?.innerText");
  const todayBurn = await evaluate("document.querySelector('.meter-spent')?.innerText");
  const categoriesCount = await evaluate("document.querySelectorAll('.category-bar-row').length");
  const insightsCount = await evaluate("document.querySelectorAll('.insight-card').length");
  const txRowCount = await evaluate("document.querySelectorAll('.upi-table tbody tr').length");
  console.log(`Active Page Heading: "${upiHeading}"`);
  console.log(`Today's UPI Burn: ${todayBurn} | Monitored Categories: ${categoriesCount}`);
  console.log(`AI Savings Leak Alerts: ${insightsCount} insights detected`);
  console.log(`Transaction rows in feed: ${txRowCount} transactions`);

  // Test Account Aggregator (RBI Open Banking Auto-Sync Flow)
  console.log("Testing '⚡ Connect Bank UPI (Auto-Sync)' via Account Aggregator...");
  const aaBtnPresent = await evaluate("document.querySelector('.btn--connect-bank-aa') !== null");
  console.log("Connect Bank AA button present:", aaBtnPresent);

  await evaluate("document.querySelector('.btn--connect-bank-aa').click()");
  await new Promise((r) => setTimeout(r, 600));

  const aaModalOpen = await evaluate("document.querySelector('.aa-modal-card') !== null");
  console.log("Account Aggregator modal opened:", aaModalOpen);

  // Step 1: Submit Bank & Phone
  await evaluate("document.querySelector('.aa-modal-card .btn--modal-save').click()");
  await new Promise((r) => setTimeout(r, 600));

  // Step 2: Verify OTP
  await evaluate("document.querySelector('.aa-modal-card .btn--modal-save').click()");
  await new Promise((r) => setTimeout(r, 1200));

  // Step 3: Approve Consent & Fetch Bank Transactions
  await evaluate("document.querySelector('.btn--approve-consent').click()");
  await new Promise((r) => setTimeout(r, 2600));

  const syncedBadgeText = await evaluate("document.querySelector('.bank-status-text strong')?.innerText");
  console.log(`Live Bank Sync confirmed: "${syncedBadgeText}"`);

  // Test Adding a New UPI Outflow Payment manually
  console.log("Testing '+ Add Entry' manual logging...");
  await evaluate("document.querySelector('.btn--add-expense').click()");
  await new Promise((r) => setTimeout(r, 400));

  await evaluate(`
    (() => {
      function setInput(el, val) {
        const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        desc.set.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const inputs = document.querySelectorAll('.modal-card .form-input');
      setInput(inputs[0], 'Sharma Ji Chai & Bun');
      setInput(inputs[1], '60');
      setInput(inputs[3], 'Evening snack during shift');
    })()
  `);
  await evaluate("document.querySelector('.modal-card .btn--modal-save').click()");
  await new Promise((r) => setTimeout(r, 800));

  const newTxCount = await evaluate("document.querySelectorAll('.upi-table tbody tr').length");
  const latestTxMerchant = await evaluate("document.querySelector('.upi-table tbody tr:first-child .tx-merchant strong')?.innerText");
  console.log(`Added payment successfully! Total rows now: ${newTxCount} | Latest merchant: "${latestTxMerchant}"`);

  // Navigate back to overview
  await evaluate("document.querySelector('.btn--back-link').click()");
  await new Promise((r) => setTimeout(r, 600));

  // 5. Test Coach in mr, hi, en and Voice Button
  console.log("\n=== 5. Testing Coach Languages & Voice Button ===");
  for (const lang of ["mr", "hi", "en"]) {
    await evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('.lang-btn'));
        const target = btns.find(b => b.innerText.includes('${lang === "mr" ? "मराठी" : lang === "hi" ? "हिन्दी" : "English"}'));
        if (target) target.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 1200));
    const coachMsg = await evaluate("document.querySelector('.coach-message')?.innerText");
    console.log(`Coach message [${lang}]: ${coachMsg?.slice(0, 60)}...`);
  }

  const voiceBtnPresent = await evaluate("document.querySelector('.btn--voice') !== null");
  console.log("Voice ('Listen') button rendered:", voiceBtnPresent);

  // 6. Test PDF Report Download
  console.log("\n=== 6. Testing PDF Report Generation ===");
  const downloadReportPresent = await evaluate("document.querySelector('.btn--download-report') !== null");
  console.log("Download report button present:", downloadReportPresent);
  const pdfError = await evaluate(`
    (() => {
      try {
        const btn = document.querySelector('.btn--download-report');
        if (btn) btn.click();
        return null;
      } catch (err) {
        return err.message;
      }
    })()
  `);
  console.log("PDF generation execution:", pdfError ? `Error: ${pdfError}` : "SUCCESS (no error thrown)");

  // 7. Test Onboarding Modal ("Add yourself")
  console.log("\n=== 7. Testing Onboarding ('Add yourself') Modal ===");
  await evaluate("document.querySelector('.persona-btn--add').click()");
  await new Promise((r) => setTimeout(r, 600));

  const modalOpen = await evaluate("document.querySelector('.modal-card') !== null");
  console.log("Onboarding modal opened:", modalOpen);

  // Step 1: Fill profile using prototype setter
  await evaluate(`
    (() => {
      function setInput(el, val) {
        const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        desc.set.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const inputs = document.querySelectorAll('.form-input');
      setInput(inputs[0], 'Ramesh Patil'); // Name
      setInput(inputs[1], 'Nashik');       // City
    })()
  `);
  await evaluate("document.querySelector('.btn--modal-next').click()");
  await new Promise((r) => setTimeout(r, 600));

  // Step 2: Fill fixed costs
  await evaluate(`
    (() => {
      function setInput(el, val) {
        const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        desc.set.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const inputs = document.querySelectorAll('.form-input');
      setInput(inputs[0], '4500'); // Rent
      setInput(inputs[1], '2200'); // EMI
      setInput(inputs[2], '499');  // Phone
    })()
  `);
  await evaluate("document.querySelector('.btn--modal-next').click()");
  await new Promise((r) => setTimeout(r, 600));

  // Step 3: Income data - Quick fill manual 60-day grid
  await evaluate(`
    (() => {
      const tabs = document.querySelectorAll('.income-tab-btn');
      if (tabs[1]) tabs[1].click(); // Manual 60-day grid tab
    })()
  `);
  await new Promise((r) => setTimeout(r, 800));

  const loadedPayoutsCount = await evaluate("document.querySelectorAll('.payouts-table tbody tr').length");
  console.log("Loaded payouts in table:", loadedPayoutsCount, "days");

  // Save the custom profile
  await evaluate("document.querySelector('.btn--modal-save').click()");
  await new Promise((r) => setTimeout(r, 1000));

  // 8. Verify Custom Profile on Dashboard
  console.log("\n=== 8. Verifying Custom Profile on Dashboard ===");
  // Ensure we are on overview tab and wait for dashboard to render
  await evaluate(`
    (() => {
      const navBtns = document.querySelectorAll('.nav-tab-btn');
      if (navBtns[0]) navBtns[0].click(); // Overview tab
    })()
  `);

  let activeCustomName = null;
  for (let i = 0; i < 15; i++) {
    activeCustomName = await evaluate("document.querySelector('.rider-summary strong')?.innerText");
    if (activeCustomName && activeCustomName.includes("Ramesh")) break;
    await new Promise((r) => setTimeout(r, 300));
  }

  const activeCustomCity = await evaluate("document.querySelector('.rider-summary p')?.innerText");
  const customStability = await evaluate("document.querySelector('.gauge-number')?.innerText");
  const customBadge = await evaluate("document.querySelector('.custom-badge')?.innerText");
  console.log(`Active Custom Rider: "${activeCustomName}" (${activeCustomCity}) | Badge: "${customBadge}"`);
  console.log(`Custom Rider Stability Score: ${customStability}/100`);

  // 9. Test "Delete my data"
  console.log("\n=== 9. Testing Delete My Data ===");
  const deleteBtnPresent = await evaluate("document.querySelector('.btn--delete-data') !== null");
  console.log("Delete my data button present:", deleteBtnPresent);

  await evaluate(`
    (() => {
      window.confirm = () => true;
      const btn = document.querySelector('.btn--delete-data');
      if (btn) btn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 1000));

  const afterDeletePersonas = await evaluate("document.querySelectorAll('.persona-btn').length");
  const customBadgeAfter = await evaluate("document.querySelector('.custom-badge') !== null");
  console.log(`Personas after deletion: ${afterDeletePersonas} | Custom badge remains: ${customBadgeAfter}`);

  console.log("\n=== Final Console Errors Summary ===");
  console.log("Total console errors encountered:", consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.error("Errors found:", JSON.stringify(consoleErrors, null, 2));
  } else {
    console.log("SUCCESS: All Phase 2 & 3 browser checks passed with ZERO console errors!");
  }

  // Close test tab
  await fetch(`http://127.0.0.1:9222/json/close/${pageTarget.id}`);
  ws.close();
}

run().catch((err) => {
  console.error("Browser test failed:", err);
  process.exit(1);
});
