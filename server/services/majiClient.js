// server/services/majiClient.js
//
// Upstream integration — SkillBridge is the CONSUMER here, calling Maji
// Website (Team 4's app). The contract below is exactly what's documented
// in src/documentation/API_NEEDS_UPSTREAM.md and ENDPOINT_LIST.md
// ("Upstream API Endpoints — Consumed by SkillBridge from Maji Website").
//
// IMPORTANT: as of this integration, Team 4 hadn't yet shared Maji
// Website's real base URL / API key with us (that interview detail —
// payment methods and stations being scoped per-estate — IS captured
// correctly below, from the Part F reflection in API_NEEDS_UPSTREAM.md).
// Until MAJI_API_BASE_URL is set in .env, every function here returns
// clearly-labeled mock data shaped exactly like the real response should
// be, so the rest of the app (routes, UI) can be built and demoed against
// a stable contract today. Flip it on for real by setting:
//
//   MAJI_API_BASE_URL=https://<their-real-host>/api
//   MAJI_API_KEY=<the key/token they issue you>
//
// in a .env file — no other code needs to change.

const BASE_URL = process.env.MAJI_API_BASE_URL;
const API_KEY = process.env.MAJI_API_KEY;

let warnedOnce = false;
function warnMockMode() {
  if (!warnedOnce) {
    console.warn(
      "[majiClient] MAJI_API_BASE_URL is not set — returning mock Maji Website data. " +
      "Set MAJI_API_BASE_URL (and MAJI_API_KEY if required) in .env once Team 4 shares their real API."
    );
    warnedOnce = true;
  }
}

async function callMaji(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `Maji Website request failed (${res.status})`);
    err.status = 502; // bad gateway — the failure is upstream, not ours
    throw err;
  }
  return res.json();
}

// ---- Mock data, shaped like the real contract (Part D of API_NEEDS_UPSTREAM.md) ----

const MOCK_STATIONS = [
  { id: "stn_01", name: "Kileleshwa Vendor Point", estate: "Kileleshwa, Nairobi", hours: "06:00–20:00", stockLevel: "high" },
  { id: "stn_02", name: "Lavington Water Hub", estate: "Lavington, Nairobi", hours: "07:00–19:00", stockLevel: "medium" },
  { id: "stn_03", name: "Westlands Pickup Station", estate: "Westlands, Nairobi", hours: "24 hours", stockLevel: "high" },
  { id: "stn_04", name: "Kilimani Community Tap", estate: "Kilimani, Nairobi", hours: "06:30–21:00", stockLevel: "low" },
];

// Per the Part F interview reflection: payment methods are scoped per
// estate (specific M-Pesa tills / gateways differ by local distributor
// agreement), not global — the mock reflects that on purpose.
const MOCK_PAYMENT_METHODS = {
  "Kileleshwa, Nairobi": [{ method: "M-Pesa Paybill", till: "400200", feeKes: 0 }, { method: "Cash on delivery", feeKes: 0 }],
  "Lavington, Nairobi": [{ method: "M-Pesa Paybill", till: "400211", feeKes: 10 }],
  default: [{ method: "Cash on delivery", feeKes: 0 }],
};

// GET /stations?estate={estate}
export async function getStations(estate) {
  if (!BASE_URL) {
    warnMockMode();
    const filtered = estate
      ? MOCK_STATIONS.filter((s) => s.estate.toLowerCase().includes(estate.toLowerCase()))
      : MOCK_STATIONS;
    return { source: "mock", stations: filtered };
  }
  const stations = await callMaji(`/stations${estate ? `?estate=${encodeURIComponent(estate)}` : ""}`);
  return { source: "live", stations };
}

// GET /estates
export async function getEstates() {
  if (!BASE_URL) {
    warnMockMode();
    return { source: "mock", estates: [...new Set(MOCK_STATIONS.map((s) => s.estate))] };
  }
  const estates = await callMaji("/estates");
  return { source: "live", estates };
}

// GET /payment-methods?estate={estate}
export async function getPaymentMethods(estate) {
  if (!BASE_URL) {
    warnMockMode();
    return { source: "mock", methods: MOCK_PAYMENT_METHODS[estate] || MOCK_PAYMENT_METHODS.default };
  }
  const methods = await callMaji(`/payment-methods${estate ? `?estate=${encodeURIComponent(estate)}` : ""}`);
  return { source: "live", methods };
}

// GET /deliveries/{id}
export async function getDelivery(id) {
  if (!BASE_URL) {
    warnMockMode();
    return { source: "mock", id, status: "in_transit", courier: "Maji Dispatch #4", etaMinutes: 22 };
  }
  const delivery = await callMaji(`/deliveries/${id}`);
  return { source: "live", ...delivery };
}

// POST /deliveries
export async function createDelivery({ stationId, estateAddress, phone, paymentMethod }) {
  if (!BASE_URL) {
    warnMockMode();
    return {
      source: "mock",
      id: `mock_${Date.now()}`,
      stationId,
      estateAddress,
      phone,
      paymentMethod,
      status: "pending",
    };
  }
  const delivery = await callMaji("/deliveries", {
    method: "POST",
    body: JSON.stringify({ stationId, estateAddress, phone, paymentMethod }),
  });
  return { source: "live", ...delivery };
}
