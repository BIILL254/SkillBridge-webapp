// __tests__/versions.test.js
//
// Week 13: Verifies that v1 is frozen, v2 has the new shape,
// deprecation headers are set correctly, and API keys are required.

import supertest from "supertest";
import app from "../server/app.js";
import { KEYS } from "./helpers.js";

const KEY = { "X-API-Key": KEYS.web };

describe("v1 is frozen", () => {
  test("GET /api/v1/experts keeps its original shape", async () => {
    const res = await supertest(app).get("/api/v1/experts").set(KEY);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(Object.keys(res.body[0]).sort()).toEqual([
      "bio",
      "estate",
      "id",
      "latitude",
      "longitude",
      "name",
      "rating",
      "skills",
    ]);
  });

  test("old unversioned /api/experts still answers the same way", async () => {
    const a = await supertest(app).get("/api/experts").set(KEY);
    const b = await supertest(app).get("/api/v1/experts").set(KEY);
    expect(a.status).toBe(200);
    expect(a.body).toEqual(b.body);
  });

  test("root unversioned /experts alias still answers the same way", async () => {
    const a = await supertest(app).get("/experts").set(KEY);
    const b = await supertest(app).get("/api/v1/experts").set(KEY);
    expect(a.status).toBe(200);
    expect(a.body).toEqual(b.body);
  });

  test("v1 error shape is unchanged", async () => {
    const res = await supertest(app).get("/api/v1/experts/999").set(KEY);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Expert not found" });
  });
});

describe("v2 has the new shape", () => {
  test("list is wrapped in { data, count }, with 'location' instead of 'estate'", async () => {
    const res = await supertest(app).get("/api/v2/experts").set(KEY);
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThan(0);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(Object.keys(res.body.data[0]).sort()).toEqual([
      "bio",
      "id",
      "latitude",
      "location",
      "longitude",
      "name",
      "rating",
      "skills",
    ]);
  });

  test("single item /api/v2/experts/:id returns wrapped data", async () => {
    const res = await supertest(app).get("/api/v2/experts/1").set(KEY);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBe(1);
    expect(res.body.data.location).toBeDefined();
    expect(res.body.data.estate).toBeUndefined();
  });

  test("location filter works on v2", async () => {
    const res = await supertest(app).get("/api/v2/experts?location=Ruiru").set(KEY);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((e) => e.location.toLowerCase().includes("ruiru"))).toBe(true);
  });
});

describe("deprecation headers", () => {
  test("v1 and old URLs announce the sunset", async () => {
    for (const path of ["/api/v1/experts", "/api/experts", "/experts", "/api/v1/experts/1"]) {
      const res = await supertest(app).get(path).set(KEY);
      expect(res.headers.deprecation).toBe("true");
      expect(res.headers.sunset).toBe("Fri, 20 Nov 2026 00:00:00 GMT");
      expect(res.headers.link).toContain('rel="successor-version"');
    }
  });

  test("v2 and unknown paths do not carry them", async () => {
    for (const path of ["/api/v2/experts", "/api/v2/experts/1", "/api/health"]) {
      const res = await supertest(app).get(path).set(KEY);
      expect(res.headers.deprecation).toBeUndefined();
    }
  });
});

describe("v2 requires an API key", () => {
  test("GET /api/v2/experts with no key returns 401", async () => {
    const res = await supertest(app).get("/api/v2/experts");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Missing or invalid API key" });
  });
});
