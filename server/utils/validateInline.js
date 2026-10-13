// server/utils/validateInline.js
// Validates inline { profile, payouts } used by /api/analyze, /api/simulate, /api/coach

/**
 * Returns { error } if invalid, or { rider, payouts } normalized and ready to use.
 * Treats missing days inside the date range as amount=0.
 * Enforces: >= 14 days of data, non-negative numeric amounts, parseable dates.
 */
export function validateInlineProfile(profile, payoutsRaw) {
  if (!profile || typeof profile !== "object") {
    return { error: "profile is required" };
  }
  if (!profile.name || typeof profile.name !== "string") {
    return { error: "profile.name is required" };
  }
  const lang = profile.language;
  if (lang && !["mr", "hi", "en"].includes(lang)) {
    return { error: "profile.language must be mr, hi, or en" };
  }

  const fixed = profile.fixed ?? {};
  for (const key of ["rent", "emi", "phone"]) {
    const v = Number(fixed[key] ?? 0);
    if (!Number.isFinite(v) || v < 0) {
      return { error: `profile.fixed.${key} must be a non-negative number` };
    }
  }

  if (!Array.isArray(payoutsRaw) || payoutsRaw.length === 0) {
    return { error: "payouts must be a non-empty array" };
  }

  // Validate and normalize each entry
  const payouts = [];
  for (const p of payoutsRaw) {
    const amount = Number(p.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return { error: `payout amount must be a non-negative number (got ${p.amount})` };
    }
    const d = new Date(p.date);
    if (isNaN(d.getTime())) {
      return { error: `payout date is not valid: ${p.date}` };
    }
    // Normalise date to YYYY-MM-DD
    const iso = d.toISOString().slice(0, 10);
    payouts.push({ date: iso, amount });
  }

  if (payouts.length < 14) {
    return { error: "At least 14 days of payout data are required" };
  }

  // Build rider shape matching what existing services expect
  const rider = {
    id:       `inline-${Date.now()}`,
    name:     profile.name,
    city:     profile.city   ?? "Unknown",
    platform: profile.platform ?? "Unknown",
    language: profile.language ?? "en",
    fixed: {
      rent:  Number(fixed.rent  ?? 0),
      emi:   Number(fixed.emi   ?? 0),
      phone: Number(fixed.phone ?? 0),
    },
  };

  return { rider, payouts };
}
