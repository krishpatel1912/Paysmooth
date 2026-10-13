const API_BASE = "/api";

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const data = await response.json();
      message = data.message || data.error || message;
    } catch {
      // Keep default error message.
    }

    throw new Error(message);
  }

  return response.json();
}

export function getRiders() {
  return apiRequest("/riders");
}

export function getSummary(id) {
  return apiRequest(`/riders/${encodeURIComponent(id)}/summary`);
}

export function analyze(profile, payouts) {
  return apiRequest("/analyze", {
    method: "POST",
    body: JSON.stringify({ profile, payouts })
  });
}

export function simulate(riderIdOrData, skipDays) {
  const payload = typeof riderIdOrData === "object"
    ? { profile: riderIdOrData.profile, payouts: riderIdOrData.payouts, skipDays: Number(skipDays) }
    : { riderId: riderIdOrData, skipDays: Number(skipDays) };

  return apiRequest("/simulate", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getCoach(riderIdOrData, language) {
  const payload = typeof riderIdOrData === "object"
    ? { profile: riderIdOrData.profile, payouts: riderIdOrData.payouts, language }
    : { riderId: riderIdOrData, language };

  return apiRequest("/coach", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function extractEarnings(imageBase64, mimeType = "image/png") {
  return apiRequest("/extract-earnings", {
    method: "POST",
    body: JSON.stringify({ imageBase64, mimeType })
  });
}