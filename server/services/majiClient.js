// server/services/majiClient.js
//
// Upstream integration — SkillBridge is the CONSUMER here, calling Maji
// Website (Team 4's app).
//
// Week 11 Resilience:
//   - Uses resilientFetch (fetchWithRetry) with 1500 ms default timeout and 2 retries
//   - Backoff delay: 200 ms, then 400 ms (fast in test environment)
//   - Retries only transient statuses (429, 500, 502, 503, 504) and respects Retry-After
//   - Never retries unsafe HTTP write operations (POST, PUT, PATCH, DELETE) or 4xx errors
//   - Maintains in-memory lastGood cache for graceful fallback when partner is down or slow
//   - Surfaces { stale: boolean, asOf: string } flags to the caller for UI disclosure

import { fetchWithRetry } from "../../resilientFetch.js";

const getBaseUrl = () => (process.env.MAJI_API_BASE_URL || "").trim().replace(/\/+$/, "");
const getApiKey = () => (process.env.MAJI_API_KEY || "").trim();

// In-memory cache for graceful fallback (Week 11 Part D)
// cacheKey -> { data, asOf }
const lastGoodCache = new Map();

export function clearLastGoodCache() {
  lastGoodCache.clear();
}

export function getLastGood(cacheKey) {
  return lastGoodCache.get(cacheKey);
}

let warnedOnce = false;
function warnMockMode() {
  if (!warnedOnce) {
    console.warn(
      "[majiClient] MAJI_API_BASE_URL is not set — returning mock Maji Website data. " +
      "Set MAJI_API_BASE_URL (and MAJI_API_KEY if required) in .env once Team 4 confirms their real API is reachable."
    );
    warnedOnce = true;
  }
}

async function callMaji(path, options = {}) {
  const baseUrl = getBaseUrl();
  const apiKey = getApiKey();
  if (!baseUrl) {
    throw Object.assign(new Error("MAJI_API_BASE_URL is not set"), { status: 502 });
  }

  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const timeoutMs = process.env.MAJI_TIMEOUT_MS
    ? parseInt(process.env.MAJI_TIMEOUT_MS, 10) || 1500
    : 1500;
  const retries = process.env.MAJI_RETRIES
    ? parseInt(process.env.MAJI_RETRIES, 10)
    : 2;
  const delayMs = process.env.MAJI_DELAY_MS
    ? parseInt(process.env.MAJI_DELAY_MS, 10)
    : (process.env.NODE_ENV === "test" ? 10 : 200);

  try {
    const res = await fetchWithRetry(
      url,
      {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}`, "X-API-Key": apiKey } : {}),
          ...options.headers,
        },
      },
      { timeoutMs, retries, delayMs }
    );

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body.error || body.message || `Maji Website request failed (${res.status})`;
      const err = new Error(msg);
      // 5xx and 404 from Maji are THEIR failure (a 404 means they do not have that
      // endpoint, e.g. not deployed yet), not "our route is missing", so we answer
      // 502. Other 4xx (such as 400 for a blank estate) are passed on as they are.
      err.status = res.status >= 500 || res.status === 404 ? 502 : res.status;
      err.upstreamStatus = res.status;
      throw err;
    }
    return res.json();
  } catch (err) {
    // Week 11 Part B: log failure reason clearly without logging API keys
    const reason = err.name === "TimeoutError" ? "timeout" : (err.cause?.code || err.code || err.message);
    console.error(`[majiClient] partner call failed: ${reason}`);

    if (err.status && err.upstreamStatus) throw err;

    const netErr = new Error(`Maji Website service unavailable: ${reason}`);
    netErr.status = 502;
    netErr.code = reason;
    netErr.isTimeout = err.name === "TimeoutError";
    throw netErr;
  }
}

// ---- Mock data, shaped exactly like Maji's real contract ----

const MOCK_ESTATES = [
  { id: "est_1029", name: "Kileleshwa, Nairobi", deliveryStatus: "active" },
  { id: "est_1031", name: "Lavington, Nairobi", deliveryStatus: "active" },
  { id: "est_1042", name: "Westlands, Nairobi", deliveryStatus: "active" },
  { id: "est_1058", name: "Kilimani, Nairobi", deliveryStatus: "inactive" },
];

const MOCK_VENDORS = [
  { vendorId: 1, businessName: "Chemchemi Fresh Water Co.", estate: "Kasarani" },
  { vendorId: 2, businessName: "Kileleshwa Fresh Water", estate: "Kileleshwa" },
  { vendorId: 3, businessName: "Lavington Water Hub", estate: "Lavington" },
  { vendorId: 4, businessName: "Westlands Pure Water", estate: "Westlands" },
  { vendorId: 5, businessName: "AquaFresh Nairobi", estate: "Dagoretti" },
];

const MOCK_ALL_VENDORS = [
  { vendorId: 1, businessName: "Chemchemi Fresh Water Co.", estate: "Kasarani", rating: 4.2, isVerified: true, isOnline: true, ownerName: "Mock Owner One", phone: "0700000001" },
  { vendorId: 2, businessName: "Kileleshwa Fresh Water", estate: "Kileleshwa", rating: 4.8, isVerified: true, isOnline: true, ownerName: "Mock Owner Two", phone: "0700000002" },
  { vendorId: 3, businessName: "Lavington Water Hub", estate: "Lavington", rating: 3.9, isVerified: false, isOnline: false, ownerName: "Mock Owner Three", phone: "0700000003" },
  { vendorId: 4, businessName: "Westlands Pure Water", estate: "Westlands", rating: 4.6, isVerified: true, isOnline: false, ownerName: "Mock Owner Four", phone: "0700000004" },
  { vendorId: 5, businessName: "AquaFresh Nairobi", estate: "Dagoretti", rating: 4.4, isVerified: true, isOnline: false, ownerName: "Mock Owner Five", phone: "0700000005" },
];

const MOCK_TOP_RATED = [
  { vendorId: 2, businessName: "Kileleshwa Fresh Water", estate: "Kileleshwa", rating: 4.8, isVerified: true, isOnline: true },
  { vendorId: 4, businessName: "Westlands Pure Water", estate: "Westlands", rating: 4.6, isVerified: true, isOnline: false },
  { vendorId: 5, businessName: "AquaFresh Nairobi", estate: "Dagoretti", rating: 4.4, isVerified: true, isOnline: false },
];

export function toMajiEstate(name) {
  return String(name ?? "").split(",")[0].trim();
}

function normalizeEstates(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList.map((item, idx) => {
    if (typeof item === "string") {
      return { id: `est_${idx + 1}`, name: item, deliveryStatus: "active" };
    }
    const name = item.name || item.estate || `Estate ${idx + 1}`;
    const id = item.id ? String(item.id) : `est_${idx + 1}`;
    const deliveryStatus = item.deliveryStatus || "active";
    return { id, name, deliveryStatus };
  });
}

// GET estates from Maji Website
export async function getEstates(deliveryStatus) {
  const baseUrl = getBaseUrl();
  const cacheKey = `estates:${deliveryStatus || "all"}`;

  if (!baseUrl) {
    warnMockMode();
    const filtered = deliveryStatus ? MOCK_ESTATES.filter((e) => e.deliveryStatus === deliveryStatus) : MOCK_ESTATES;
    return { source: "mock", estates: filtered, stale: false, asOf: new Date().toISOString() };
  }

  let rawData;
  try {
    try {
      rawData = await callMaji("/api/orders/active/estates");
    } catch (err) {
      if (err.upstreamStatus === 404) {
        rawData = await callMaji(`/estates${deliveryStatus ? `?deliveryStatus=${encodeURIComponent(deliveryStatus)}` : ""}`);
      } else {
        throw err;
      }
    }

    const normalized = normalizeEstates(rawData);
    const filtered = deliveryStatus ? normalized.filter((e) => e.deliveryStatus === deliveryStatus) : normalized;
    const asOf = new Date().toISOString();
    lastGoodCache.set(cacheKey, { estates: filtered, asOf });
    return { source: "live", estates: filtered, stale: false, asOf };
  } catch (err) {
    const saved = lastGoodCache.get(cacheKey);
    if (saved) {
      console.warn(`[majiClient] Serving saved estates from ${saved.asOf}. Partner is not responding.`);
      return { source: "cached", estates: saved.estates, stale: true, asOf: saved.asOf };
    }
    throw err;
  }
}

// GET /api/vendors/locations[?estate=]
export async function getStations(estateName) {
  const estate = estateName ? toMajiEstate(estateName) : "";
  const baseUrl = getBaseUrl();
  const cacheKey = `stations:${estate}`;

  if (!baseUrl) {
    warnMockMode();
    const stations = estate
      ? MOCK_VENDORS.filter((v) => v.estate.toLowerCase() === estate.toLowerCase())
      : MOCK_VENDORS;
    return { source: "mock", stations, stale: false, asOf: new Date().toISOString() };
  }

  try {
    const raw = await callMaji(`/api/vendors/locations${estate ? `?estate=${encodeURIComponent(estate)}` : ""}`);
    if (!Array.isArray(raw)) {
      throw Object.assign(new Error("Maji Website returned an unexpected response for vendor locations"), { status: 502, isSchemaError: true });
    }
    const stations = raw.map((v) => ({ vendorId: v.vendorId, businessName: v.businessName, estate: v.estate }));
    const asOf = new Date().toISOString();
    lastGoodCache.set(cacheKey, { stations, asOf });
    return { source: "live", stations, stale: false, asOf };
  } catch (err) {
    if (err.status === 400 || err.isSchemaError) throw err; // client/schema errors: pass through

    const saved = lastGoodCache.get(cacheKey);
    if (saved) {
      console.warn(`[majiClient] Serving saved stations from ${saved.asOf}. Partner is not responding.`);
      return { source: "cached", stations: saved.stations, stale: true, asOf: saved.asOf };
    }
    throw err;
  }
}

// GET /api/vendors/all[?estate=]
export async function getAllVendors(estateName) {
  const estate = estateName ? toMajiEstate(estateName) : "";
  const baseUrl = getBaseUrl();
  const cacheKey = `vendors:all:${estate}`;

  if (!baseUrl) {
    warnMockMode();
    const vendors = estate
      ? MOCK_ALL_VENDORS.filter((v) => v.estate.toLowerCase() === estate.toLowerCase())
      : MOCK_ALL_VENDORS;
    return { source: "mock", vendors, stale: false, asOf: new Date().toISOString() };
  }

  try {
    const raw = await callMaji(`/api/vendors/all${estate ? `?estate=${encodeURIComponent(estate)}` : ""}`);
    if (!Array.isArray(raw)) {
      throw Object.assign(new Error("Maji Website returned an unexpected response for the vendor list"), { status: 502, isSchemaError: true });
    }
    const vendors = raw.map((v) => ({
      vendorId: v.vendorId,
      businessName: v.businessName,
      estate: v.estate,
      rating: v.rating,
      isVerified: v.isVerified,
      isOnline: v.isOnline,
      ownerName: v.ownerName ?? null,
      phone: v.phone ?? null,
    }));
    const asOf = new Date().toISOString();
    lastGoodCache.set(cacheKey, { vendors, asOf });
    return { source: "live", vendors, stale: false, asOf };
  } catch (err) {
    if (err.status === 400 || err.isSchemaError) throw err;

    const saved = lastGoodCache.get(cacheKey);
    if (saved) {
      console.warn(`[majiClient] Serving saved vendors/all from ${saved.asOf}. Partner is not responding.`);
      return { source: "cached", vendors: saved.vendors, stale: true, asOf: saved.asOf };
    }
    throw err;
  }
}

// GET /api/vendors/top-rated
export async function getTopRatedVendors() {
  const baseUrl = getBaseUrl();
  const cacheKey = "vendors:top-rated";

  if (!baseUrl) {
    warnMockMode();
    return { source: "mock", vendors: MOCK_TOP_RATED, stale: false, asOf: new Date().toISOString() };
  }

  try {
    const raw = await callMaji("/api/vendors/top-rated");
    if (!Array.isArray(raw)) {
      throw Object.assign(new Error("Maji Website returned an unexpected response for top-rated vendors"), { status: 502, isSchemaError: true });
    }
    const vendors = raw.map((v) => ({
      vendorId: v.vendorId,
      businessName: v.businessName,
      estate: v.estate,
      rating: v.rating,
      isVerified: v.isVerified,
      isOnline: v.isOnline,
    }));
    const asOf = new Date().toISOString();
    lastGoodCache.set(cacheKey, { vendors, asOf });
    return { source: "live", vendors, stale: false, asOf };
  } catch (err) {
    if (err.isSchemaError) throw err;

    const saved = lastGoodCache.get(cacheKey);
    if (saved) {
      console.warn(`[majiClient] Serving saved top-rated vendors from ${saved.asOf}. Partner is not responding.`);
      return { source: "cached", vendors: saved.vendors, stale: true, asOf: saved.asOf };
    }
    throw err;
  }
}

export async function getCustomerPaymentMethod(customerId) {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    warnMockMode();
    return { source: "mock", customerId, paymentMethod: "mpesa" };
  }
  const result = await callMaji(`/customers/payment-method?customerId=${encodeURIComponent(customerId)}`);
  return { source: "live", ...result };
}

// POST: write endpoint, never retried or cached
export async function registerDriverInterest(estateId, { userId, contactMethod } = {}) {
  if (!userId) throw Object.assign(new Error("userId is required"), { status: 400 });
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    warnMockMode();
    return {
      source: "mock",
      id: `mock_di_${Date.now()}`,
      userId,
      estateId,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
  }
  const result = await callMaji(`/estates/${encodeURIComponent(estateId)}/driver-interests`, {
    method: "POST",
    body: JSON.stringify({ userId, contactMethod }),
  });
  return { source: "live", ...result };
}

const NOT_SUPPORTED_MESSAGE =
  "Maji Website's actual API has no delivery-tracking endpoints (no GET /deliveries/{id} or POST /deliveries). " +
  "See Question 1 in src/documentation/CONTRACT_QUESTIONS.md — this is pending clarification from Team 4.";

export async function getDelivery() {
  throw Object.assign(new Error(NOT_SUPPORTED_MESSAGE), { status: 501 });
}

export async function createDelivery() {
  throw Object.assign(new Error(NOT_SUPPORTED_MESSAGE), { status: 501 });
}
