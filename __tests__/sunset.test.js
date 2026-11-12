// Week 14: the v1 retirement behaviour (server/middleware/deprecate.js), tested
// with a fake clock so it does not depend on today's date.

import express from "express";
import supertest from "supertest";
import { deprecated } from "../server/middleware/deprecate.js";
import { request, app } from "./helpers.js";

const SUNSET = "2026-11-20";
const successor = (req) => `/api/v2/experts${req.path === "/" ? "" : req.path}`;

function appAt(isoNow, options = {}) {
  const a = express();
  a.use(deprecated({ sunset: SUNSET, successor, now: () => new Date(isoNow).getTime(), ...options }));
  a.get("/", (req, res) => res.json({ ok: true }));
  a.get("/:id", (req, res) => res.json({ id: req.params.id }));
  return a;
}

describe("before the sunset date", () => {
  test("v1 keeps working and announces the date, even when enforcement is on", async () => {
    const res = await supertest(appAt("2026-11-19T23:59:59Z", { enforce: true })).get("/13");
    expect(res.status).toBe(200);
    expect(res.headers.deprecation).toBe("true");
    expect(res.headers.sunset).toBe("Fri, 20 Nov 2026 00:00:00 GMT");
  });
});

describe("after the sunset date", () => {
  test("enforcement off (the default): v1 still answers, with the headers", async () => {
    const res = await supertest(appAt("2026-12-01T00:00:00Z", { enforce: false })).get("/13");
    expect(res.status).toBe(200);
    expect(res.headers.deprecation).toBe("true");
  });

  test("enforcement on: 410 Gone naming the successor", async () => {
    const res = await supertest(appAt("2026-11-20T00:00:00Z", { enforce: true })).get("/13");
    expect(res.status).toBe(410);
    expect(res.body).toEqual({
      error: "This API version has been retired",
      sunset: "Fri, 20 Nov 2026 00:00:00 GMT",
      successor: "/api/v2/experts/13",
    });
    expect(res.headers.link).toBe('</api/v2/experts/13>; rel="successor-version"');
  });
});

describe("the successor link follows the path", () => {
  test("the list points to the v2 list", async () => {
    const res = await supertest(appAt("2026-11-01T00:00:00Z")).get("/");
    expect(res.headers.link).toBe('</api/v2/experts>; rel="successor-version"');
  });

  test("on the real app, v1 single, unversioned and root aliases point to the matching v2 path", async () => {
    for (const path of ["/api/v1/experts/13", "/api/experts/13", "/experts/13"]) {
      const res = await request(app).get(path);
      expect(res.headers.link).toBe('</api/v2/experts/13>; rel="successor-version"');
    }
    const list = await request(app).get("/api/v1/experts");
    expect(list.headers.link).toBe('</api/v2/experts>; rel="successor-version"');
  });

  test("a string successor still works (the Week 13 usage)", async () => {
    const a = express();
    a.use(deprecated({ sunset: SUNSET, successor: "/api/v2/experts", enforce: false }));
    a.get("/", (req, res) => res.json({}));
    const res = await supertest(a).get("/");
    expect(res.headers.link).toBe('</api/v2/experts>; rel="successor-version"');
  });
});
