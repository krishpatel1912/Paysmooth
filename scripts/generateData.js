import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DAY_MS = 24 * 60 * 60 * 1000;

const riders = [
  {
    id: "ravi",
    name: "Ravi",
    city: "Nashik",
    platform: "Swiggy",
    language: "mr",
    fixed: {
      rent: 6000,
      emi: 3500,
      phone: 400,
    },
    type: "volatile",
  },
  {
    id: "priya",
    name: "Priya",
    city: "Pune",
    platform: "Zomato",
    language: "hi",
    fixed: {
      rent: 8500,
      emi: 2800,
      phone: 500,
    },
    type: "steady",
  },
  {
    id: "arjun",
    name: "Arjun",
    city: "Mumbai",
    platform: "Uber",
    language: "en",
    fixed: {
      rent: 12000,
      emi: 5000,
      phone: 650,
    },
    type: "high",
  },
];

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function roundTo10(value) {
  return Math.round(value / 10) * 10;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function getLast60Days() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const days = [];

  for (let i = 59; i >= 0; i--) {
    days.push(new Date(today.getTime() - i * DAY_MS));
  }

  return days;
}

function festivalMultiplier(index) {
  const spikeCenters = [13, 34, 51];

  for (const center of spikeCenters) {
    const distance = Math.abs(index - center);

    if (distance === 0) {
      return randomBetween(1.5, 1.9);
    }

    if (distance === 1) {
      return randomBetween(1.2, 1.45);
    }
  }

  return 1;
}

function generateRavi(days) {
  return days.map((date, index) => {
    let amount = randomBetween(300, 1200);

    if (isWeekend(date)) {
      amount *= randomBetween(1.15, 1.35);
    }

    amount *= festivalMultiplier(index);
    amount *= randomBetween(0.9, 1.1);

    // Occasional day off or very low-demand day.
    if (Math.random() < 0.07) {
      amount = 0;
    }

    return {
      date: formatDate(date),
      amount: amount === 0 ? 0 : roundTo10(Math.min(amount, 1800)),
    };
  });
}

function generatePriya(days) {
  return days.map((date, index) => {
    let amount = randomBetween(600, 900);

    if (isWeekend(date)) {
      amount *= randomBetween(1.05, 1.15);
    }

    amount *= festivalMultiplier(index);
    amount *= randomBetween(0.96, 1.04);

    // Priya has fewer missed work days.
    if (Math.random() < 0.035) {
      amount = 0;
    }

    return {
      date: formatDate(date),
      amount: amount === 0 ? 0 : roundTo10(Math.min(amount, 1350)),
    };
  });
}

function generateArjun(days) {
  const payouts = [];

  for (let weekStart = 0; weekStart < days.length; weekStart += 7) {
    const weekEnd = Math.min(weekStart + 7, days.length);
    const weekLength = weekEnd - weekStart;

    const zeroCount = Math.min(
      weekLength,
      Math.random() < 0.55 ? 2 : 3
    );

    const indexes = Array.from(
      { length: weekLength },
      (_, i) => weekStart + i
    );

    indexes.sort(() => Math.random() - 0.5);

    const zeroDays = new Set(indexes.slice(0, zeroCount));

    for (let index = weekStart; index < weekEnd; index++) {
      const date = days[index];

      if (zeroDays.has(index)) {
        payouts.push({
          date: formatDate(date),
          amount: 0,
        });
        continue;
      }

      let amount = randomBetween(1000, 1800);

      if (isWeekend(date)) {
        amount *= randomBetween(1.1, 1.3);
      }

      amount *= festivalMultiplier(index);
      amount *= randomBetween(0.92, 1.08);

      payouts.push({
        date: formatDate(date),
        amount: roundTo10(Math.min(amount, 2800)),
      });
    }
  }

  return payouts;
}

function generatePayouts(rider, days) {
  switch (rider.type) {
    case "volatile":
      return generateRavi(days);

    case "steady":
      return generatePriya(days);

    case "high":
      return generateArjun(days);

    default:
      return [];
  }
}

function generateData() {
  const days = getLast60Days();

  return riders.map(({ type, ...rider }) => ({
    ...rider,
    payouts: generatePayouts({ ...rider, type }, days),
  }));
}

function writeData() {
  const outputDir = path.resolve(__dirname, "../data");
  const outputFile = path.join(outputDir, "riders.json");

  fs.mkdirSync(outputDir, { recursive: true });

  const data = generateData();

  fs.writeFileSync(
    outputFile,
    JSON.stringify(data, null, 2),
    "utf8"
  );

  console.log(`Generated ${data.length} riders in ${outputFile}`);
  console.log("Each rider has 60 days of payout history.");
}

writeData();