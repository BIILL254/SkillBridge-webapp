// server/services/majiClient.js
//
// Upstream integration — SkillBridge is the CONSUMER here, calling Maji
// Website (Team 4's app).
//
// IMPORTANT — this file was rewritten after receiving Maji's real
// openapi.yaml (Week 4 contract handoff, saved at
// src/documentation/MAJI_OPENAPI_RECEIVED.yaml). Their actual contract
// turned out to differ significantly from what was assumed during the
// Week 2/3 needs conversation and endpoint list:
//
//   - /vendors/stations has NO estate query filter, and doesn't return
//     hours or stockLevel — it returns a targetEstateId instead (a
//     foreign key into /estates), which we have to cross-reference
//     ourselves.
//   - /customers/payment-method returns ONE customer's own saved payment
//     method (mpesa/cash/other) — it is not a list of payment options
//     available for a checkout screen. SkillBridge doesn't have a
//     "customer" concept that maps onto this, so this endpoint isn't
//     usable for the original "show payment options at checkout" need.
//   - There is no delivery-tracking capability at all — no
//     GET /deliveries/{id}, no POST /deliveries. Functions for those are
//     kept below as clearly-marked stubs that throw, rather than quietly
//     mock-succeeding, so nothing in the app can accidentally depend on a
//     capability Maji doesn't actually offer.
//   - Maji unexpectedly exposes POST /estates/{estateId}/driver-interests
//     (register interest in doing delivery work) — SkillBridge has no
//     current use for this, but the client function is included for
//     completeness in case a "become a water delivery driver" feature
//     ever makes sense for students.
//
// See src/documentation/CONTRACT_QUESTIONS.md for the specific questions
// raised about these gaps.
//
// UPDATE (28 Oct 2026) — Maji replaced the Week 4 contract above. Their
// CURRENT contract (src/documentation/MAJI_OPENAPI_CURRENT.yaml, see
// MAJI_CONTRACT_UPDATE.md) has no authentication and these read-only calls:
//   GET /api/orders/active/estates       -> [{ estate }]
//   GET /api/orders/active/schedules     -> [{ estate, deliveryTime }]
//   GET /api/vendors/locations?estate=   -> [{ vendorId, businessName, estate }]
//   GET /api/vendors/top-rated           -> [{ vendorId, businessName, estate, rating, ... }]
// /vendors/stations no longer exists: getStations() below now calls
// /api/vendors/locations, which DOES have an estate filter (so the extra
// round trip to /estates is gone). The estate name must match Maji's spelling
// (e.g. Kileleshwa, Lang'ata); capitalisation is ignored.
//
// As before: until MAJI_API_BASE_URL is set in .env, every function
// returns mock data — but now shaped to match Maji's REAL schema, not our
// earlier guess, so switching to live mode later is a clean swap.

const getBaseUrl = () => (process.env.MAJI_API_BASE_URL || "").trim().replace(/\/+$/, "");
const getApiKey = () => (process.env.MAJI_API_KEY || "").trim();

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
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}`, "X-API-Key": apiKey } : {}),
        ...options.headers,
      },
      signal: AbortSignal.timeout(Number(process.env.MAJI_TIMEOUT_MS) || 30000), // free-tier host: first call after idle can be slow
    });

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
    const causeCode = err.cause?.code || err.code || "";
    console.error(`[majiClient] Call to ${path} failed:`, causeCode || err.message);

    if (err.status && err.upstreamStatus) throw err;

    const netErr = new Error(`Maji Website service unavailable: ${causeCode || err.message}`);
    netErr.status = 502;
    netErr.code = causeCode;
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

const MOCK_STATIONS = [
  { vendorId: "ven_201", stationName: "Kileleshwa Vendor Point", targetEstateId: "est_1029" },
  { vendorId: "ven_204", stationName: "Lavington Water Hub", targetEstateId: "est_1031" },
  { vendorId: "ven_211", stationName: "Westlands Pickup Station", targetEstateId: "est_1042" },
];

// Mock vendors, shaped like Maji's CURRENT GET /api/vendors/locations
const MOCK_VENDORS = [
  { vendorId: 1, businessName: "Chemchemi Fresh Water Co.", estate: "Kasarani" },
  { vendorId: 2, businessName: "Kileleshwa Fresh Water", estate: "Kileleshwa" },
  { vendorId: 3, businessName: "Lavington Water Hub", estate: "Lavington" },
  { vendorId: 4, businessName: "Westlands Pure Water", estate: "Westlands" },
  { vendorId: 5, businessName: "AquaFresh Nairobi", estate: "Dagoretti" },
];
// GET /api/vendors/all: every vendor, with contact details. The phone numbers
// below are made-up placeholders for mock mode.
const MOCK_ALL_VENDORS = [
  { vendorId: 1, businessName: "Chemchemi Fresh Water Co.", estate: "Kasarani", rating: 4.2, isVerified: true, isOnline: true, ownerName: "Mock Owner One", phone: "0700000001" },
  { vendorId: 2, businessName: "Kileleshwa Fresh Water", estate: "Kileleshwa", rating: 4.8, isVerified: true, isOnline: true, ownerName: "Mock Owner Two", phone: "0700000002" },
  { vendorId: 3, businessName: "Lavington Water Hub", estate: "Lavington", rating: 3.9, isVerified: false, isOnline: false, ownerName: "Mock Owner Three", phone: "0700000003" },
  { vendorId: 4, businessName: "Westlands Pure Water", estate: "Westlands", rating: 4.6, isVerified: true, isOnline: false, ownerName: "Mock Owner Four", phone: "0700000004" },
  { vendorId: 5, businessName: "AquaFresh Nairobi", estate: "Dagoretti", rating: 4.4, isVerified: true, isOnline: false, ownerName: "Mock Owner Five", phone: "0700000005" },
];
// ...and GET /api/vendors/top-rated (the best verified vendor per estate)
const MOCK_TOP_RATED = [
  { vendorId: 2, businessName: "Kileleshwa Fresh Water", estate: "Kileleshwa", rating: 4.8, isVerified: true, isOnline: true },
  { vendorId: 4, businessName: "Westlands Pure Water", estate: "Westlands", rating: 4.6, isVerified: true, isOnline: false },
  { vendorId: 5, businessName: "AquaFresh Nairobi", estate: "Dagoretti", rating: 4.4, isVerified: true, isOnline: false },
];

// Our students' estates look like "Kileleshwa, Nairobi"; Maji's are just
// "Kileleshwa". Keep the part before the first comma.
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
// Accommodates both their deployed /api/orders/active/estates endpoint
// and their Week 4 OpenAPI contract (/estates?deliveryStatus={active|inactive})
export async function getEstates(deliveryStatus) {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    warnMockMode();
    const filtered = deliveryStatus ? MOCK_ESTATES.filter((e) => e.deliveryStatus === deliveryStatus) : MOCK_ESTATES;
    return { source: "mock", estates: filtered };
  }

  let rawData;
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
  return { source: "live", estates: filtered };
}

// GET /api/vendors/locations[?estate=]  (Maji's current contract)
//
// Returns only the fields we use, picked by name, so nothing extra Maji might
// add later is passed on to our own callers by accident.
export async function getStations(estateName) {
  const estate = estateName ? toMajiEstate(estateName) : "";
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    warnMockMode();
    const stations = estate
      ? MOCK_VENDORS.filter((v) => v.estate.toLowerCase() === estate.toLowerCase())
      : MOCK_VENDORS;
    return { source: "mock", stations };
  }

  const raw = await callMaji(`/api/vendors/locations${estate ? `?estate=${encodeURIComponent(estate)}` : ""}`);
  if (!Array.isArray(raw)) {
    throw Object.assign(new Error("Maji Website returned an unexpected response for vendor locations"), { status: 502 });
  }
  const stations = raw.map((v) => ({ vendorId: v.vendorId, businessName: v.businessName, estate: v.estate }));
  return { source: "live", stations };
}

// GET /api/vendors/all[?estate=]  (every Maji vendor; added by Maji on 29 Oct 2026)
//
// Maji treats every vendor as someone students can approach about water sales
// and water treatment (there is no separate "trainer" field). Unlike
// top-rated, this keeps ownerName and phone: students need a way to reach a
// vendor who is meant to teach them. Our route that serves it is behind the
// API key AND a student login, so the numbers are never public.
export async function getAllVendors(estateName) {
  const estate = estateName ? toMajiEstate(estateName) : "";
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    warnMockMode();
    const vendors = estate
      ? MOCK_ALL_VENDORS.filter((v) => v.estate.toLowerCase() === estate.toLowerCase())
      : MOCK_ALL_VENDORS;
    return { source: "mock", vendors };
  }
  const raw = await callMaji(`/api/vendors/all${estate ? `?estate=${encodeURIComponent(estate)}` : ""}`);
  if (!Array.isArray(raw)) {
    throw Object.assign(new Error("Maji Website returned an unexpected response for the vendor list"), { status: 502 });
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
  return { source: "live", vendors };
}

// GET /api/vendors/top-rated  (the highest-rated verified vendor in each estate)
//
// Maji also sends each vendor's ownerName and phone. We deliberately DROP
// those: no student-facing screen needs a vendor owner's personal number, and
// "if the consumer never needs the field, don't return it".
export async function getTopRatedVendors() {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    warnMockMode();
    return { source: "mock", vendors: MOCK_TOP_RATED };
  }
  const raw = await callMaji("/api/vendors/top-rated");
  if (!Array.isArray(raw)) {
    throw Object.assign(new Error("Maji Website returned an unexpected response for top-rated vendors"), { status: 502 });
  }
  const vendors = raw.map((v) => ({
    vendorId: v.vendorId,
    businessName: v.businessName,
    estate: v.estate,
    rating: v.rating,
    isVerified: v.isVerified,
    isOnline: v.isOnline,
  }));
  return { source: "live", vendors };
}

// GET /customers/payment-method
//
// NOT a fit for the original "show payment options at checkout" need —
// this returns a single customer's own saved method, and SkillBridge has
// no "customer" record to look one up by. Kept only so the shape is
// documented and callable if a real use for it turns up later; nothing
// in the app currently calls this.
export async function getCustomerPaymentMethod(customerId) {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    warnMockMode();
    return { source: "mock", customerId, paymentMethod: "mpesa" };
  }
  const result = await callMaji(`/customers/payment-method?customerId=${encodeURIComponent(customerId)}`);
  return { source: "live", ...result };
}

// POST /estates/{estateId}/driver-interests
//
// Not currently wired into any SkillBridge UI — included because it's a
// real, working endpoint Maji exposes, in case a future feature (e.g. a
// student signing up to help deliver water for group sessions) wants it.
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

// ---------------------------------------------------------------------
// The functions below (getDelivery / createDelivery) were part of the
// ORIGINAL assumed contract but have no counterpart in Maji's real API —
// there is no delivery-tracking capability exposed at all. Rather than
// silently returning fake "it worked" mock data forever (which would let
// bugs hide until someone tried this in production), these now throw a
// clear, specific error so any caller finds out immediately that this
// capability doesn't exist upstream, and points at the question raised
// about it.
// ---------------------------------------------------------------------

const NOT_SUPPORTED_MESSAGE =
  "Maji Website's actual API has no delivery-tracking endpoints (no GET /deliveries/{id} or POST /deliveries). " +
  "See Question 1 in src/documentation/CONTRACT_QUESTIONS.md — this is pending clarification from Team 4.";

export async function getDelivery() {
  throw Object.assign(new Error(NOT_SUPPORTED_MESSAGE), { status: 501 });
}

export async function createDelivery() {
  throw Object.assign(new Error(NOT_SUPPORTED_MESSAGE), { status: 501 });
}
