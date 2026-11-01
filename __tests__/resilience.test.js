// __tests__/resilience.test.js
//
// Week 11 Resilience Tests:
//   - Timeouts
//   - Exponential backoff retries (capped at 2)
//   - Status filtering (retry transient 5xx/429, never retry 4xx)
//   - Idempotency (never retry writes)
//   - Graceful fallback with in-memory cache ({ stale: true, asOf })

import { fetchWithRetry } from "../resilientFetch.js";
import { request, app, login, auth } from "./helpers.js";
import { clearLastGoodCache } from "../server/services/majiClient.js";

let token;
beforeAll(async () => {
  ({ token } = await login("billamani"));
});

describe("resilientFetch unit tests", () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it("succeeds on first attempt without retrying", async () => {
    let attempts = 0;
    global.fetch = async () => {
      attempts += 1;
      return { status: 200, ok: true, json: async () => ({ ok: true }) };
    };

    const res = await fetchWithRetry("https://example.com/api", {}, { timeoutMs: 500, retries: 2, delayMs: 10 });
    expect(res.status).toBe(200);
    expect(attempts).toBe(1);
  });

  it("flaky partner: fails twice with 503, succeeds on 3rd attempt", async () => {
    let attempts = 0;
    global.fetch = async () => {
      attempts += 1;
      if (attempts < 3) {
        return { status: 503, ok: false, headers: new Headers() };
      }
      return { status: 200, ok: true, json: async () => ({ data: "success" }) };
    };

    const res = await fetchWithRetry("https://example.com/api", {}, { timeoutMs: 500, retries: 2, delayMs: 10 });
    expect(res.status).toBe(200);
    expect(attempts).toBe(3);
  });

  it("caps retries at 2 (total 3 attempts on continuous 500 error)", async () => {
    let attempts = 0;
    global.fetch = async () => {
      attempts += 1;
      return { status: 500, ok: false, headers: new Headers() };
    };

    const res = await fetchWithRetry("https://example.com/api", {}, { timeoutMs: 500, retries: 2, delayMs: 10 });
    expect(res.status).toBe(500);
    expect(attempts).toBe(3); // 1 initial + 2 retries
  });

  it("never retries client errors: 400, 401, 403, 404 (only 1 attempt)", async () => {
    for (const status of [400, 401, 403, 404]) {
      let attempts = 0;
      global.fetch = async () => {
        attempts += 1;
        return { status, ok: false, headers: new Headers() };
      };

      const res = await fetchWithRetry("https://example.com/api", {}, { timeoutMs: 500, retries: 2, delayMs: 10 });
      expect(res.status).toBe(status);
      expect(attempts).toBe(1);
    }
  });

  it("never retries HTTP write methods (POST, PUT, DELETE) even on 500 error", async () => {
    for (const method of ["POST", "PUT", "DELETE"]) {
      let attempts = 0;
      global.fetch = async () => {
        attempts += 1;
        return { status: 500, ok: false, headers: new Headers() };
      };

      const res = await fetchWithRetry("https://example.com/api", { method }, { timeoutMs: 500, retries: 2, delayMs: 10 });
      expect(res.status).toBe(500);
      expect(attempts).toBe(1); // writes must never be retried
    }
  });

  it("times out if server hangs longer than timeoutMs", async () => {
    global.fetch = async (_url, { signal }) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve({ status: 200, ok: true }), 1000);
        if (signal) {
          signal.addEventListener("abort", () => {
            clearTimeout(timer);
            const err = new Error("The operation was aborted");
            err.name = "TimeoutError";
            reject(err);
          });
        }
      });
    };

    await expect(
      fetchWithRetry("https://example.com/api", {}, { timeoutMs: 50, retries: 0, delayMs: 10 })
    ).rejects.toThrow();
  });

  it("honors Retry-After on 429", async () => {
    let attempts = 0;
    const timestamps = [];
    global.fetch = async () => {
      attempts += 1;
      timestamps.push(Date.now());
      if (attempts === 1) {
        const headers = new Map([["Retry-After", "1"]]);
        return {
          status: 429,
          ok: false,
          headers: { get: (h) => headers.get(h) },
        };
      }
      return { status: 200, ok: true };
    };

    const res = await fetchWithRetry("https://example.com/api", {}, { timeoutMs: 2000, retries: 1, delayMs: 10 });
    expect(res.status).toBe(200);
    expect(attempts).toBe(2);
    // Should have waited at least ~900 ms based on Retry-After: 1
    expect(timestamps[1] - timestamps[0]).toBeGreaterThanOrEqual(900);
  });
});

describe("Graceful in-memory fallback integration (server/services/majiClient.js)", () => {
  const realFetch = global.fetch;
  beforeEach(() => {
    process.env.MAJI_API_BASE_URL = "https://maji.example.test/";
    clearLastGoodCache();
  });
  afterEach(() => {
    global.fetch = realFetch;
    process.env.MAJI_API_BASE_URL = "";
    clearLastGoodCache();
  });

  it("returns live data with stale: false on successful partner call", async () => {
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => [{ vendorId: 10, businessName: "Live Vendor", estate: "Kasarani" }],
    });

    const res = await request(app).get("/api/logistics/stations?estate=Kasarani").set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.source).toBe("live");
    expect(res.body.stale).toBe(false);
    expect(typeof res.body.asOf).toBe("string");
    expect(res.body.stations[0].businessName).toBe("Live Vendor");
  });

  it("gracefully falls back to saved data with stale: true when partner goes down after working", async () => {
    // 1. Initial successful call populates in-memory cache
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => [{ vendorId: 10, businessName: "Saved Vendor", estate: "Kasarani" }],
    });

    const firstRes = await request(app).get("/api/logistics/stations?estate=Kasarani").set(auth(token));
    expect(firstRes.status).toBe(200);
    expect(firstRes.body.stale).toBe(false);

    // 2. Partner crashes / returns 500 on all attempts
    global.fetch = async () => ({
      ok: false,
      status: 500,
      headers: new Headers(),
      json: async () => ({ error: "Database crashed" }),
    });

    // 3. User request succeeds with saved data instead of failing!
    const secondRes = await request(app).get("/api/logistics/stations?estate=Kasarani").set(auth(token));
    expect(secondRes.status).toBe(200);
    expect(secondRes.body.source).toBe("cached");
    expect(secondRes.body.stale).toBe(true);
    expect(secondRes.body.asOf).toBe(firstRes.body.asOf);
    expect(secondRes.body.stations[0].businessName).toBe("Saved Vendor");
  });

  it("returns friendly 502 error if partner is down and nothing was ever saved", async () => {
    // Partner is down from the very beginning
    global.fetch = async () => ({
      ok: false,
      status: 500,
      headers: new Headers(),
      json: async () => ({ error: "Server down" }),
    });

    const res = await request(app).get("/api/logistics/stations?estate=Kasarani").set(auth(token));
    expect(res.status).toBe(502);
    expect(res.body.error).toBeDefined();
  });
});

