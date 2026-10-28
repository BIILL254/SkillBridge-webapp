// Week 9: API key authentication. These tests deliberately use plain
// supertest (not the helper that adds a key automatically).
import supertest from "supertest";
import express from "express";
import app from "../server/app.js";
import { KEYS } from "./helpers.js";
import { parseApiKeys, createRequireApiKey } from "../server/middleware/apiKey.js";

const raw = () => supertest(app);

describe("a request with NO key is rejected with 401", () => {
  it.each([
    ["get", "/api/experts"],
    ["get", "/api/experts/13"],
    ["get", "/api/skills"],
    ["get", "/api/users"],
    ["get", "/api/requests"],
    ["get", "/api/sessions"],
    ["get", "/api/profile"],
    ["get", "/api/admin/users"],
    ["get", "/api/logistics/stations"],
    ["get", "/api/logistics/vendors/all"],
    ["post", "/api/auth/login"],
    ["post", "/api/auth/signup"],
    ["post", "/api/requests"],
    ["get", "/api/does-not-exist"],
  ])("%s %s -> 401", async (method, url) => {
    const res = await raw()[method](url).send({});
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Missing or invalid API key" });
  });

  it("the route handler never runs: invalid login body still gets 401, not the handler's 400", async () => {
    const res = await raw().post("/api/auth/login").send({});
    expect(res.status).toBe(401);
  });

  it("even a malformed JSON body gets 401 (the body is not parsed before the key check)", async () => {
    const res = await raw().post("/api/auth/login").set("Content-Type", "application/json").send("{ not json");
    expect(res.status).toBe(401);
  });

  it("a valid student login token alone is not enough: the app key is still required", async () => {
    const login = await supertest(app).post("/api/auth/login").set("X-API-Key", KEYS.web).send({ username: "billamani", password: "1234" });
    const res = await raw().get("/api/profile").set("Authorization", `Bearer ${login.body.token}`);
    expect(res.status).toBe(401);
  });
});

// The root aliases (/experts, /skills, /requests) exist for AgroConnect. They
// must NOT be a way around the key: same rule as the /api versions.
describe("root aliases need the key too", () => {
  it.each([["get", "/experts"], ["get", "/skills"], ["get", "/requests"], ["post", "/requests"]])(
    "%s %s with no key -> 401",
    async (method, url) => {
      const res = await raw()[method](url).send({});
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Missing or invalid API key" });
    }
  );

  it.each([["get", "/experts"], ["get", "/skills"]])("%s %s with a valid key -> 200", async (method, url) => {
    const res = await raw()[method](url).set("X-API-Key", KEYS.agroconnect);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("/swagger and /test are public docs pages (like /docs), not data", async () => {
    for (const url of ["/swagger", "/test"]) {
      const res = await raw().get(url);
      expect(res.status).toBe(200);
      expect(res.text).toContain("SwaggerUIBundle");
    }
  });
});

describe("a request with a WRONG key is rejected with 401", () => {
  it.each([
    ["a random string", "wrong"],
    ["an empty header", ""],
    ["a key with a letter changed", "test-key-webX"],
    ["a truncated real key", "test-key-we"],
    ["a real key with extra characters", `${KEYS.web}extra`],
    ["a real key in the wrong case", KEYS.web.toUpperCase()],
    ["a partner NAME instead of its key", "agroconnect"],
  ])("%s", async (_label, key) => {
    const res = await raw().get("/api/experts").set("X-API-Key", key);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Missing or invalid API key" });
  });

  it("the key is only accepted in the X-API-Key header, not the query string or Authorization", async () => {
    expect((await raw().get(`/api/experts?apiKey=${KEYS.web}`)).status).toBe(401);
    expect((await raw().get("/api/experts").set("Authorization", `Bearer ${KEYS.web}`)).status).toBe(401);
  });
});

describe("a request with a VALID key succeeds", () => {
  it.each(Object.entries(KEYS))("the %s key gets 200 from GET /api/experts", async (_name, key) => {
    const res = await raw().get("/api/experts").set("X-API-Key", key);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(14);
  });

  it("works for POST too (login with the key + credentials)", async () => {
    const res = await raw().post("/api/auth/login").set("X-API-Key", KEYS.agroconnect).send({ username: "billamani", password: "1234" });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
  });

  it("the downstream consultation booking works for AgroConnect with its own key and no student login", async () => {
    const res = await raw().post("/api/requests").set("X-API-Key", KEYS.agroconnect)
      .send({ expertId: 13, farmerName: "Test Farmer", topic: "Soil Health", date: "2026-11-01T09:00:00Z" });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("Pending");
  });

  it("the key is never echoed back in a response body or header", async () => {
    const res = await raw().get("/api/experts").set("X-API-Key", KEYS.agroconnect);
    expect(JSON.stringify(res.body)).not.toContain(KEYS.agroconnect);
    expect(JSON.stringify(res.headers)).not.toContain(KEYS.agroconnect);
  });
});

describe("the only open doors", () => {
  it("GET /api/health needs no key", async () => {
    const res = await raw().get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("the published docs and the contract file need no key (they hold no data)", async () => {
    expect((await raw().get("/openapi.yaml")).status).toBe(200);
    expect((await raw().get("/docs/openapi.json")).status).toBe(200);
  });

  it("a browser CORS preflight (OPTIONS) is answered without a key", async () => {
    const res = await raw().options("/api/experts")
      .set("Origin", "https://example.test")
      .set("Access-Control-Request-Method", "GET")
      .set("Access-Control-Request-Headers", "x-api-key");
    expect(res.status).toBe(204);
  });

  it("does not advertise the framework (no X-Powered-By header)", async () => {
    const res = await raw().get("/api/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("parseApiKeys", () => {
  it("parses name:key pairs and trims whitespace", () => {
    expect(parseApiKeys(" a:111 , b:222 ")).toEqual([{ name: "a", key: "111" }, { name: "b", key: "222" }]);
  });
  it("accepts a bare key and names it by position", () => {
    expect(parseApiKeys("abc,def")).toEqual([{ name: "consumer-1", key: "abc" }, { name: "consumer-2", key: "def" }]);
  });
  it("ignores blank entries and entries with no key", () => {
    expect(parseApiKeys(",, a:, :x ,")).toEqual([{ name: "consumer-2", key: "x" }]);
  });
  it("returns an empty list for undefined or empty", () => {
    expect(parseApiKeys(undefined)).toEqual([]);
    expect(parseApiKeys("")).toEqual([]);
  });
});

describe("fails closed", () => {
  it("with NO keys configured, every request is rejected (even one that sends a key)", async () => {
    const mini = express();
    mini.use(createRequireApiKey({ partnerKeys: "", webKey: "" }));
    mini.get("/x", (req, res) => res.json({ ok: true }));
    expect((await supertest(mini).get("/x")).status).toBe(401);
    expect((await supertest(mini).get("/x").set("X-API-Key", "anything")).status).toBe(401);
    expect((await supertest(mini).get("/x").set("X-API-Key", "")).status).toBe(401);
  });
});
