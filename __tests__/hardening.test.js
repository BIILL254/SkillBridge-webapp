// Week 14 hardening: security headers and one JSON shape for every 404.

import supertest from "supertest";
import { request, app } from "./helpers.js";

describe("security headers", () => {
  test("data responses carry nosniff, frame deny, no-referrer and no-store", async () => {
    const res = await request(app).get("/api/v2/experts");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["referrer-policy"]).toBe("no-referrer");
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  test("a 401 carries them too", async () => {
    const res = await supertest(app).get("/api/v2/experts");
    expect(res.status).toBe(401);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  test("the health check carries them", async () => {
    const res = await supertest(app).get("/api/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  test("the published docs may still be cached", async () => {
    const res = await supertest(app).get("/openapi.yaml");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["cache-control"]).not.toBe("no-store");
  });

  test("the server does not announce Express", async () => {
    const res = await supertest(app).get("/api/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  test("HSTS is sent only over HTTPS", async () => {
    const plain = await supertest(app).get("/api/health");
    expect(plain.headers["strict-transport-security"]).toBeUndefined();
  });
});

describe("unknown paths", () => {
  test.each(["/api/nothing", "/nothing", "/api/v3/experts", "/expert"])("%s returns the JSON 404", async (path) => {
    const res = await request(app).get(path);
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body).toEqual({ error: "Not found" });
  });
});
