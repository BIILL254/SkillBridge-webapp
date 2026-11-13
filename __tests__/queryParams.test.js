// Week 14 hardening: malformed query strings must give a 400, never a 500,
// and v2 must reject bad input exactly like v1.

import { request, app } from "./helpers.js";

const ROUTES = ["/api/v1/experts", "/api/experts", "/api/v2/experts"];

describe.each(ROUTES)("%s rejects malformed query strings", (base) => {
  test.each([
    ["repeated lat", "lat=1&lat=2"],
    ["repeated lng", "lng=1&lng=2"],
    ["nested lat", "lat[a]=1"],
    ["repeated sort", "sort=rating&sort=x"],
    ["repeated estate", "estate=a&estate=b"],
  ])("%s returns 400", async (_name, qs) => {
    const res = await request(app).get(`${base}?${qs}`);
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe("string");
  });

  test("an unknown sort is 400", async () => {
    const res = await request(app).get(`${base}?sort=name`);
    expect(res.status).toBe(400);
  });

  test("lat out of range is 400", async () => {
    const res = await request(app).get(`${base}?lat=95&lng=36`);
    expect(res.status).toBe(400);
  });

  test("sort=proximity without coordinates is 400", async () => {
    const res = await request(app).get(`${base}?sort=proximity`);
    expect(res.status).toBe(400);
  });

  test("a good query still works", async () => {
    const res = await request(app).get(`${base}?sort=proximity&lat=-1.2&lng=36.9`);
    expect(res.status).toBe(200);
  });
});

describe("v2 specifics", () => {
  test("repeated location is 400", async () => {
    const res = await request(app).get("/api/v2/experts?location=a&location=b");
    expect(res.status).toBe(400);
  });

  test("estate still works as a filter name on v2", async () => {
    const res = await request(app).get("/api/v2/experts?estate=Ruiru");
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThan(0);
  });

  test("unknown expert is 404 on every v2 sub-route", async () => {
    for (const path of ["/api/v2/experts/99999", "/api/v2/experts/99999/availability", "/api/v2/experts/99999/reviews"]) {
      const res = await request(app).get(path);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: expect.any(String) });
    }
  });
});
