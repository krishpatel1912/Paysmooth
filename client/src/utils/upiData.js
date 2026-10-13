// client/src/utils/upiData.js

export const UPI_CATEGORIES = {
  FUEL: { id: "fuel", label: "Petrol & Bike Care", icon: "⛽", color: "#38bdf8" },
  CHAI_FOOD: { id: "chai_food", label: "Chai, Snacks & Food", icon: "☕", color: "#f59e0b" },
  BILLS: { id: "bills", label: "Mobile & Utility Bills", icon: "📱", color: "#a855f7" },
  GROCERIES: { id: "groceries", label: "Groceries & Household", icon: "🛒", color: "#10b981" },
  MISC: { id: "misc", label: "Impulse & Miscellaneous", icon: "⚡", color: "#f43f5e" }
};

/**
 * Generates 30 days of realistic Indian delivery gig worker UPI transactions
 */
export function generateDefaultUpiTransactions(riderName = "Ravi") {
  const transactions = [];
  const now = new Date();

  // Transaction templates common to Indian delivery riders
  const fuelVendors = ["HPCL Petrol Pump", "Indian Oil Auto Hub", "Bharat Petroleum", "Shell Fuel Station"];
  const foodVendors = ["Tapri Chai & Bun Maska", "Chai Point", "Anna Dosa Corner", "Sharma Ji Samosa", "Vada Pav Stall", "Roadside Thali"];
  const groceryVendors = ["Kirana Store UPI", "Swiggy Instamart", "Zepto Delivery", "Supermart Groceries"];
  const billVendors = ["Airtel Prepaid 5G Recharge", "Jio Data Booster", "Electricity Bill UPI", "Bike Tyre Air & Oil"];
  const miscVendors = ["Paan Shop UPI", "Cold Drinks & Water", "Local Pharmacy", "Hardware Repair"];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayOfWeek = d.getDay(); // 0 is Sunday, 6 is Saturday

    // 1. Daily petrol/fuel (almost every day for active riders: ₹120 - ₹220)
    if (dayOfWeek !== 2) { // 6 days a week
      transactions.push({
        id: `upi-fuel-${i}`,
        date: dateStr,
        merchant: fuelVendors[i % fuelVendors.length],
        category: "fuel",
        amount: 150 + ((i * 13) % 70),
        vpa: `hpcl.petrol.${(i % 5) + 1}@upi`,
        notes: "Daily delivery bike fuel"
      });
    }

    // 2. Daily Chai, snacks & energy refreshments (2-3 times a day: ₹40 - ₹90)
    transactions.push({
      id: `upi-chai-${i}`,
      date: dateStr,
      merchant: foodVendors[i % foodVendors.length],
      category: "chai_food",
      amount: 40 + ((i * 17) % 50),
      vpa: `taprichai.${(i % 7) + 1}@paytm`,
      notes: "Tea, bun maska & afternoon energy snack"
    });

    // 3. Occasional groceries / household shopping (once or twice a week)
    if (i % 5 === 0) {
      transactions.push({
        id: `upi-groc-${i}`,
        date: dateStr,
        merchant: groceryVendors[i % groceryVendors.length],
        category: "groceries",
        amount: 320 + ((i * 23) % 280),
        vpa: `kirana.mart@ybl`,
        notes: "Rice, vegetables and household necessities"
      });
    }

    // 4. Monthly/Bi-weekly bills (Phone recharge, bike maintenance)
    if (i === 12 || i === 26) {
      transactions.push({
        id: `upi-bill-${i}`,
        date: dateStr,
        merchant: billVendors[i % billVendors.length],
        category: "bills",
        amount: i === 12 ? 399 : 250,
        vpa: `airtel.bills@okhdfcbank`,
        notes: i === 12 ? "Monthly unlimited calling & 2.5GB/day data" : "Bike clutch & brake cable adjustment"
      });
    }

    // 5. Minor impulse/cold drink purchases
    if (i % 4 === 1) {
      transactions.push({
        id: `upi-misc-${i}`,
        date: dateStr,
        merchant: miscVendors[i % miscVendors.length],
        category: "misc",
        amount: 30 + ((i * 11) % 40),
        vpa: `shop.merchant@icici`,
        notes: "Bottled water & impulse roadside snack"
      });
    }
  }

  // Sort descending by date
  return transactions.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Analyzes UPI transactions to generate category breakdowns, total spend,
 * and AI-driven leak detection insights with concrete rupee savings.
 */
export function analyzeUpiSpending(transactions = [], weeklyFixed = { rent: 0, emi: 0, phone: 0 }) {
  const categoryTotals = {
    fuel: 0,
    chai_food: 0,
    bills: 0,
    groceries: 0,
    misc: 0
  };

  let totalSpent = 0;
  const todayStr = new Date().toISOString().slice(0, 10);
  let todaySpent = 0;

  transactions.forEach((tx) => {
    const amt = Number(tx.amount) || 0;
    totalSpent += amt;
    if (categoryTotals[tx.category] !== undefined) {
      categoryTotals[tx.category] += amt;
    } else {
      categoryTotals.misc += amt;
    }

    if (tx.date === todayStr) {
      todaySpent += amt;
    }
  });

  const categoryList = Object.entries(categoryTotals).map(([catKey, total]) => {
    const meta = UPI_CATEGORIES[catKey.toUpperCase()] || UPI_CATEGORIES.MISC;
    const percentage = totalSpent > 0 ? Math.round((total / totalSpent) * 100) : 0;
    return {
      key: catKey,
      label: meta.label,
      icon: meta.icon,
      color: meta.color,
      total: Math.round(total),
      percentage
    };
  }).sort((a, b) => b.total - a.total);

  // Generate Smart Savings Leaks Insights
  const insights = [];

  // 1. Chai & Snacks Leak
  const chaiTotal = categoryTotals.chai_food || 0;
  if (chaiTotal > 1200) {
    const monthlyChai = chaiTotal;
    const saveableByOneChai = Math.round(monthlyChai * 0.35); // Cutting 1 cup a day saves ~35%
    const emiCoveragePct = weeklyFixed.emi > 0 
      ? Math.round((saveableByOneChai / (weeklyFixed.emi * 4.3)) * 100) 
      : 30;

    insights.push({
      id: "chai_leak",
      title: "Tea & Street Snacks Leak Detected",
      icon: "☕",
      severity: "warning",
      amountMonthly: monthlyChai,
      savingsPotential: saveableByOneChai,
      message: `You spent ₹${monthlyChai.toLocaleString("en-IN")} on roadside chai & snacks this month. Cutting just 1 cup of tea per shift saves ~₹${saveableByOneChai.toLocaleString("en-IN")}/month.`,
      actionTip: `That saving alone covers ${emiCoveragePct}% of your monthly bike EMI!`
    });
  }

  // 2. Fuel Efficiency Insight
  const fuelTotal = categoryTotals.fuel || 0;
  if (fuelTotal > 2500) {
    const fuelSavings = Math.round(fuelTotal * 0.12); // 12% saving via tyre pressure and eco-cruising
    insights.push({
      id: "fuel_efficiency",
      title: "Delivery Fuel Optimization",
      icon: "⛽",
      severity: "tip",
      amountMonthly: fuelTotal,
      savingsPotential: fuelSavings,
      message: `Fuel accounts for ${categoryList.find(c => c.key === "fuel")?.percentage || 30}% of your total UPI outflows (₹${fuelTotal.toLocaleString("en-IN")}).`,
      actionTip: `Keeping tyre pressure at 32 PSI and avoiding abrupt acceleration can save ~₹${fuelSavings.toLocaleString("en-IN")}/month in petrol bills.`
    });
  }

  // 3. Impulse & Micro-Purchases
  const miscTotal = categoryTotals.misc || 0;
  if (miscTotal > 500) {
    insights.push({
      id: "misc_leak",
      title: "Unmonitored Micro-Transfers",
      icon: "⚡",
      severity: "notice",
      amountMonthly: miscTotal,
      savingsPotential: Math.round(miscTotal * 0.5),
      message: `You spent ₹${miscTotal.toLocaleString("en-IN")} on random small UPI QR scans under ₹50.`,
      actionTip: `Setting a strict daily cash pocket limit can immediately recover ~₹${Math.round(miscTotal * 0.5).toLocaleString("en-IN")}.`
    });
  }

  return {
    totalSpent: Math.round(totalSpent),
    todaySpent: Math.round(todaySpent),
    categoryTotals,
    categoryList,
    insights
  };
}
