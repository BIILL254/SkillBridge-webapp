// Week 12: request logging and the /api/stats numbers.
//
// Part 1 tests the middleware directly with small fake request/response objects,
// so every number is exact. Part 2 sends real requests through the real app.

import { EventEmitter } from "node:events";
import supertest from "supertest";
import app from "../server/app.js";
import { KEYS } from "./helpers.js";
import {
  monitor,
  statsHandler,
  resetStats,
  setLogSink,
  routePattern,
  countEvent,
} from "../server/middleware/monitoring.js";

let lines;
beforeEach(() => {
  resetStats();
  lines = [];
  setLogSink((l) => lines.push(JSON.parse(l)));
});
afterAll(() => setLogSink(null));

// Runs one fake request through monitor() and finishes it with the given status.
function fakeRequest({
  method = "GET",
  originalUrl = "/api/experts",
  route,
  apiConsumer,
  status = 200,
  path,
}) {
  const req = {
    method,
    originalUrl,
    path: path ?? originalUrl.split("?")[0],
    route,
    apiConsumer,
  };
  const res = new EventEmitter();
  res.statusCode = status;
  monitor(req, res, () => {});
  res.emit("finish");
  return { req, res };
}
const readStats = () => {
  let out;
  statsHandler(
    {},
    {
      json: (b) => {
        out = b;
      },
    },
  );
  return out;
};

describe("the log line", () => {
  it("has exactly time, method, path, status, ms and caller", () => {
    fakeRequest({
      originalUrl: "/api/experts",
      route: { path: "/" },
      apiConsumer: "agroconnect",
      status: 200,
    });
    expect(lines.length).toBe(1);
    expect(Object.keys(lines[0]).sort()).toEqual([
      "caller",
      "method",
      "ms",
      "path",
      "status",
      "time",
    ]);
    expect(lines[0]).toMatchObject({
      method: "GET",
      path: "/api/experts",
      status: 200,
      caller: "agroconnect",
    });
    expect(typeof lines[0].ms).toBe("number");
    expect(Number.isNaN(Date.parse(lines[0].time))).toBe(false);
  });

  it("caller is 'none' when no valid key was found", () => {
    fakeRequest({ status: 401 });
    expect(lines[0].caller).toBe("none");
  });

  it("never logs the query string", () => {
    fakeRequest({
      originalUrl:
        "/api/experts?estate=Westlands&email=bill@example.com&token=abc123",
    });
    expect(lines[0].path).toBe("/api/experts");
    expect(JSON.stringify(lines[0])).not.toMatch(
      /bill@example|abc123|Westlands/,
    );
  });

  it("logs the full path even when it was answered inside a router (where req.path is shortened)", () => {
    fakeRequest({
      originalUrl: "/api/experts/13",
      path: "/13",
      route: { path: "/:id" },
    });
    expect(lines[0].path).toBe("/api/experts/13");
  });

  it("skips the host's /api/health uptime check (it would drown real traffic)", () => {
    fakeRequest({ originalUrl: "/api/health", path: "/api/health" });
    expect(lines.length).toBe(0);
    expect(readStats().total).toBe(0);
  });
});

describe("routePattern", () => {
  it.each([
    ["/api/experts/13", "/:id", "/api/experts/:id"],
    [
      "/api/experts/13/availability",
      "/:id/availability",
      "/api/experts/:id/availability",
    ],
    ["/api/experts", "/", "/api/experts"],
    ["/api/experts/", "/", "/api/experts"],
    ["/experts/13", "/:id", "/experts/:id"],
    ["/api/stats", "/api/stats", "/api/stats"],
  ])("%s matched by %s becomes %s", (url, routePath, expected) => {
    expect(routePattern({ originalUrl: url, route: { path: routePath } })).toBe(
      expected,
    );
  });

  it("returns null when no route matched", () => {
    expect(routePattern({ originalUrl: "/nope" })).toBe(null);
  });
});

describe("the totals", () => {
  it("counts every request, and separates 4xx (caller's mistake) from 5xx (our fault)", () => {
    fakeRequest({ status: 200, route: { path: "/" } });
    fakeRequest({ status: 200, route: { path: "/" } });
    fakeRequest({ status: 404, route: { path: "/" } });
    fakeRequest({ status: 401 });
    fakeRequest({ status: 500, route: { path: "/" } });
    const s = readStats();
    expect(s.total).toBe(5);
    expect(s.clientErrors).toBe(2);
    expect(s.serverErrors).toBe(1);
    expect(s.errorRatePercent).toBe(20); // 5xx only: 1 of 5
  });

  it("different ids share ONE row: /api/experts/1 and /api/experts/2 are both GET /api/experts/:id", () => {
    fakeRequest({ originalUrl: "/api/experts/1", route: { path: "/:id" } });
    fakeRequest({ originalUrl: "/api/experts/2", route: { path: "/:id" } });
    fakeRequest({
      originalUrl: "/api/experts/99",
      route: { path: "/:id" },
      status: 404,
    });
    const routes = readStats().routes;
    expect(Object.keys(routes)).toEqual(["GET /api/experts/:id"]);
    expect(routes["GET /api/experts/:id"]).toMatchObject({
      count: 3,
      clientErrors: 1,
      serverErrors: 0,
    });
  });

  it("requests that never reached a route (401, 429, unknown path) go in '(no route)'", () => {
    fakeRequest({ status: 401 });
    fakeRequest({ originalUrl: "/api/nothing", status: 404 });
    expect(readStats().routes["GET (no route)"].count).toBe(2);
  });

  it("each route reports its average and its slowest time, and maxMs >= avgMs", () => {
    for (let i = 0; i < 3; i++) fakeRequest({ route: { path: "/" } });
    const r = readStats().routes["GET /api/experts"];
    expect(r.count).toBe(3);
    expect(typeof r.avgMs).toBe("number");
    expect(r.maxMs).toBeGreaterThanOrEqual(r.avgMs);
  });

  it("with no traffic: zeros, not NaN", () => {
    const s = readStats();
    expect(s.total).toBe(0);
    expect(s.avgMs).toBe(0);
    expect(s.errorRatePercent).toBe(0);
  });

  it("named events (such as the saved Maji copy being served) show up under 'events'", () => {
    countEvent("majiSavedCopyServed");
    countEvent("majiSavedCopyServed");
    expect(readStats().events).toEqual({ majiSavedCopyServed: 2 });
  });
});

describe("through the real app", () => {
  const withKey = (key = KEYS.agroconnect) => ({ "X-API-Key": key });
  const settle = () => new Promise((resolve) => setTimeout(resolve, 20)); // let the "finish" events run

  it("a 200 and a 401 are both logged, and rejected requests are logged because monitor runs first", async () => {
    await supertest(app).get("/api/experts").set(withKey());
    await supertest(app).get("/api/experts").set(withKey("wrong-key"));
    await supertest(app).get("/api/experts");
    await settle();
    expect(lines.map((l) => l.status)).toEqual([200, 401, 401]);
    expect(lines.map((l) => l.caller)).toEqual(["agroconnect", "none", "none"]);
  });

  it("the log never contains the key, a query string or a password", async () => {
    await supertest(app).get("/api/experts?estate=SECRETPLACE").set(withKey());
    await supertest(app)
      .post("/api/auth/login")
      .set(withKey())
      .send({ username: "billamani", password: "hunter2-not-real" });
    await settle();
    const everything = JSON.stringify(lines);
    expect(everything).not.toContain(KEYS.agroconnect);
    expect(everything).not.toContain("SECRETPLACE");
    expect(everything).not.toContain("hunter2-not-real");
  });

  it("GET /api/stats needs a key (401 without)", async () => {
    expect((await supertest(app).get("/api/stats")).status).toBe(401);
    expect((await supertest(app).get("/stats")).status).toBe(401);
  });

  it("GET /api/stats reports the whole picture, grouped by route pattern", async () => {
    await supertest(app).get("/api/experts/13").set(withKey());
    await supertest(app).get("/api/experts/9999").set(withKey()); // 404
    await supertest(app).get("/api/does-not-exist").set(withKey()); // 404, no route
    await supertest(app).get("/api/experts").set(withKey("wrong")); // 401
    await settle();
    const res = await supertest(app).get("/api/stats").set(withKey());
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("startedAt");
    expect(res.body).toHaveProperty("uptimeSeconds");
    expect(res.body.total).toBe(4); // /api/stats does not count itself in its own reply
    expect(res.body.clientErrors).toBe(3);
    expect(res.body.serverErrors).toBe(0);
    expect(res.body.errorRatePercent).toBe(0);
    expect(res.body.routes["GET /api/experts/:id"]).toMatchObject({
      count: 2,
      clientErrors: 1,
    });
    expect(res.body.routes["GET (no route)"].count).toBe(2);
  });

  it("/api/stats shows up in the next reply", async () => {
    await supertest(app).get("/api/stats").set(withKey());
    await settle();
    const res = await supertest(app).get("/api/stats").set(withKey());
    expect(res.body.routes["GET /api/stats"].count).toBe(1);
  });
});
