// Week 9: rate limiting. Uses its own tiny limits, so the app is imported
// AFTER the environment is changed (a fresh copy per test file).
import supertest from "supertest";
import express from "express";
import { createRequireApiKey, createRateLimit } from "../server/middleware/apiKey.js";

let app;
beforeAll(async () => {
  process.env.RATE_LIMIT_MAX = "3";
  process.env.RATE_LIMIT_WEB_MAX = "4";
  process.env.RATE_LIMIT_WINDOW_MS = "60000";
  app = (await import("../server/app.js")).default;
});

const get = (key, path = "/api/experts") => supertest(app).get(path).set("X-API-Key", key);

describe("rate limiting on the real app (limit 3 per window per partner key)", () => {
  it("allows 3 requests, then answers 429 with Retry-After and a JSON body", async () => {
    const codes = [];
    for (let i = 0; i < 5; i++) codes.push((await get("test-key-agroconnect")).status);
    expect(codes).toEqual([200, 200, 200, 429, 429]);

    const blocked = await get("test-key-agroconnect");
    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toMatch(/^\d+$/);
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThanOrEqual(1);
    expect(Number(blocked.headers["retry-after"])).toBeLessThanOrEqual(60);
    expect(blocked.body.error).toBe("Too many requests");
    expect(blocked.body.retryAfter).toBe(Number(blocked.headers["retry-after"]));
  });

  it("counts each key separately: one consumer hitting its limit does not block another", async () => {
    // agroconnect is already over its limit from the test above
    expect((await get("test-key-agroconnect")).status).toBe(429);
    expect((await get("test-key-team")).status).toBe(200);
  });

  it("reports the allowance in X-RateLimit headers", async () => {
    const res = await get("test-key-team");
    expect(res.headers["x-ratelimit-limit"]).toBe("3");
    expect(Number(res.headers["x-ratelimit-remaining"])).toBeGreaterThanOrEqual(0);
  });

  it("requests with a wrong or missing key never use up a real consumer's allowance", async () => {
    const fresh = await import("../server/middleware/apiKey.js");
    const mini = express();
    mini.use(fresh.createRequireApiKey({ partnerKeys: "solo:key-solo", webKey: "" }));
    mini.use(fresh.createRateLimit({ windowMs: 60000, max: 2 }));
    mini.get("/x", (req, res) => res.json({ ok: true }));
    for (let i = 0; i < 10; i++) expect((await supertest(mini).get("/x").set("X-API-Key", "bad")).status).toBe(401);
    expect((await supertest(mini).get("/x").set("X-API-Key", "key-solo")).status).toBe(200);
    expect((await supertest(mini).get("/x").set("X-API-Key", "key-solo")).status).toBe(200);
    expect((await supertest(mini).get("/x").set("X-API-Key", "key-solo")).status).toBe(429);
  });

  it("/api/health is not rate limited and needs no key", async () => {
    for (let i = 0; i < 10; i++) expect((await supertest(app).get("/api/health")).status).toBe(200);
  });
});

describe("the limiter itself", () => {
  const build = (opts) => {
    const mini = express();
    mini.set("trust proxy", true);
    mini.use(createRequireApiKey({ partnerKeys: "p:key-p", webKey: "key-web" }));
    mini.use(createRateLimit(opts));
    mini.get("/x", (req, res) => res.json({ ok: true }));
    return mini;
  };

  it("the counter resets after the window passes", async () => {
    const mini = build({ windowMs: 1100, max: 1 });
    const hit = () => supertest(mini).get("/x").set("X-API-Key", "key-p");
    expect((await hit()).status).toBe(200);
    expect((await hit()).status).toBe(429);
    await new Promise((r) => setTimeout(r, 1200));
    expect((await hit()).status).toBe(200);
  });

  it("the public web key is limited per IP address, so one student cannot lock out another", async () => {
    const mini = build({ windowMs: 60000, max: 1, webMax: 2 });
    const web = (ip) => supertest(mini).get("/x").set("X-API-Key", "key-web").set("X-Forwarded-For", ip);
    expect((await web("10.0.0.1")).status).toBe(200);
    expect((await web("10.0.0.1")).status).toBe(200);
    expect((await web("10.0.0.1")).status).toBe(429);
    expect((await web("10.0.0.2")).status).toBe(200); // a different student is unaffected
  });
});
