// server/services/gemini.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// Lazy-initialized so dotenv has already run by the time the first request arrives
let genAI = null;
function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

function getCandidateModels() {
  const custom = process.env.GEMINI_MODEL;
  const candidates = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.8-flash"];
  if (custom && !candidates.includes(custom)) {
    candidates.unshift(custom);
  } else if (custom) {
    // Put user specified model first
    const idx = candidates.indexOf(custom);
    candidates.splice(idx, 1);
    candidates.unshift(custom);
  }
  return candidates;
}

/**
 * Generates localized advice for a gig rider using Gemini Flash.
 * Falls back to a localized static message if API key is missing or call fails.
 */
export async function getCoachMessage({ rider, forecast, buckets, language = "en" }) {
  const fallbackMessages = {
    mr: `नमस्कार ${rider?.name || 'मित्र'}! या आठवड्यात तुमचे निश्चित खर्च (किराया, EMI) आधी बाजूला ठेवा आणि दररोज कमाल ₹${buckets?.spendable ? Math.round(buckets.spendable / 7) : 300} पेक्षा जास्त खर्च करू नका.`,
    hi: `नमस्ते ${rider?.name || 'दोस्त'}! इस हफ्ते अपने पक्के खर्चे (किराया, EMI) पहले सुरक्षित रखें और रोजाना ₹${buckets?.spendable ? Math.round(buckets.spendable / 7) : 300} से अधिक खर्च न करें।`,
    en: `Hello ${rider?.name || 'friend'}! Prioritize your fixed expenses (rent, EMI) this week and cap your daily discretionary spending at ₹${buckets?.spendable ? Math.round(buckets.spendable / 7) : 300}.`
  };

  const selectedFallback = fallbackMessages[language] || fallbackMessages.en;

  if (!getGenAI()) {
    return selectedFallback;
  }

  const total7DayForecast = forecast?.reduce((sum, item) => sum + (item.predicted || 0), 0) || 0;
  const dailySpendLimit = buckets?.spendable ? Math.round(buckets.spendable / 7) : 0;

  const prompt = `
Rider Name: ${rider?.name || 'Rider'}
City: ${rider?.city || 'India'}
Platform: ${rider?.platform || 'Delivery'}
Language code requested: ${language}

Financial context for the coming week:
- Predicted 7-day total income: ₹${total7DayForecast}
- Weekly Rent allocation needed: ₹${buckets?.rent || 0}
- Weekly EMI allocation needed: ₹${buckets?.emi || 0}
- Safe Daily Spending Limit: ₹${dailySpendLimit}

Provide a short 2-3 sentence coaching message in language '${language}'. Include a concrete rupee amount recommendation.
`;

  const models = getCandidateModels();
  for (const modelName of models) {
    try {
      const model = getGenAI().getGenerativeModel({
        model: modelName,
        systemInstruction: `You are a friendly, encouraging money coach for an Indian gig worker (delivery rider).
Provide actionable financial guidance in max 3 short sentences.
Always reply entirely in the requested language: "mr" for Marathi, "hi" for Hindi, "en" for English.
Always mention ONE concrete rupee action (e.g. "Save ₹200 today for your EMI" or "Limit daily spending to ₹350").
NEVER give investment, stock market, mutual fund, or crypto advice. Focus strictly on cash flow, daily spending limits, and fixed expense protection.`
      });

      const response = await model.generateContent(prompt);
      const text = response.response.text();
      if (text && text.trim()) {
        return text.trim();
      }
    } catch (error) {
      console.warn(`Model ${modelName} error in getCoachMessage:`, error.message);
    }
  }

  return selectedFallback;
}

/**
 * Extracts daily earnings from a screenshot using Gemini Vision.
 * Returns an array of { date: "YYYY-MM-DD", amount: number }.
 */
export async function extractEarningsFromImage(base64Data, mimeType = "image/png") {
  if (!getGenAI()) {
    throw new Error("Gemini API key is not configured.");
  }

  const prompt = `You are an expert data extractor. Examine this screenshot of a delivery or gig worker payout/earnings screen (e.g., Zomato, Swiggy, Zepto, Uber, Porter).
Extract the daily earnings or payouts into a valid JSON array of objects.
Each object MUST have:
- "date": string in "YYYY-MM-DD" format (if year is not present, use 2025; ensure month and day are 2 digits)
- "amount": non-negative number representing the earnings/payout in INR.

Return ONLY valid raw JSON with NO markdown fences, no explanation, no backticks.
Example output format:
[{"date":"2025-05-01","amount":650},{"date":"2025-05-02","amount":720}]`;

  const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");

  const models = getCandidateModels();
  let lastError = null;

  for (const modelName of models) {
    try {
      const model = getGenAI().getGenerativeModel({ model: modelName });
      const response = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType || "image/png"
          }
        }
      ]);

      const rawText = response.response.text()?.trim() || "";
      const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

      let parsed = [];
      try {
        parsed = JSON.parse(cleaned);
      } catch (err) {
        const jsonMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          continue;
        }
      }

      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .filter(row => row && row.date && row.amount !== undefined)
          .map(row => ({
            date: String(row.date).slice(0, 10),
            amount: Math.max(0, Number(row.amount) || 0)
          }));
      }
    } catch (err) {
      console.warn(`Model ${modelName} error in extractEarningsFromImage:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error("Unable to extract earnings from screenshot");
}