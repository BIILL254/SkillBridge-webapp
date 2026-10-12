// These tests are written from openapi.yaml (the contract AgroConnect builds
// against), NOT from the implementation: every required field of the
// contract's `Expert`, `Availability` and `ReviewSummary` schemas is asserted
// by name and type.
import { request, app, login, auth } from "./helpers.js";

const isExpertShape = (e) => {
  expect(Number.isInteger(e.id)).toBe(true);
  expect(typeof e.name).toBe("string");
  expect(typeof e.estate).toBe("string");
  expect(typeof e.rating).toBe("number");
  expect(typeof e.latitude).toBe("number");
  expect(typeof e.longitude).toBe("number");
  if (e.bio !== undefined) expect(typeof e.bio).toBe("string");
};

describe("GET /api/experts", () => {
  it("returns an array of Expert objects with every required contract field", async () => {
    const res = await request(app).get("/api/experts");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(14);
    res.body.forEach(isExpertShape);
  });

  it("uses latitude/longitude as the contract says (not a nested coordinates object)", async () => {
    const res = await request(app).get("/api/experts");
    expect(res.body[0]).not.toHaveProperty("coordinates");
    expect(res.body[0].latitude).toBeLessThan(0);   // Nairobi is south of the equator
    expect(res.body[0].longitude).toBeGreaterThan(36);
  });

  it("defaults to best-rated first, and sort=rating gives the same order", async () => {
    const def = await request(app).get("/api/experts");
    const byRating = await request(app).get("/api/experts?sort=rating");
    const ratings = def.body.map((e) => e.rating);
    expect(ratings).toEqual([...ratings].sort((a, b) => b - a));
    expect(byRating.body.map((e) => e.id)).toEqual(def.body.map((e) => e.id));
  });

  it("sort=proximity orders by distance from lat/lng, nearest first, with distanceKm", async () => {
    // Bill Amani's own coordinates -> he must come out first, at distance 0
    const res = await request(app).get("/api/experts?sort=proximity&lat=-1.2762&lng=36.7816");
    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe("Bill Amani");
    expect(res.body[0].distanceKm).toBe(0);
    const d = res.body.map((e) => e.distanceKm);
    expect(d).toEqual([...d].sort((a, b) => a - b));
  });

  it("filters by estate, case-insensitively", async () => {
    const res = await request(app).get("/api/experts?estate=KIAMBU");
    expect(res.status).toBe(200);
    expect(res.body.map((e) => e.name).sort()).toEqual(["Amina Farah", "Samuel Mwangi"]);
    res.body.forEach((e) => expect(e.estate.toLowerCase()).toContain("kiambu"));
  });

  it("edge case: an estate nobody is in returns an empty array, not an error", async () => {
    const res = await request(app).get("/api/experts?estate=Atlantis");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("estate filter and proximity sort work together", async () => {
    const res = await request(app).get("/api/experts?estate=Nairobi&sort=proximity&lat=-1.2921&lng=36.8219");
    expect(res.status).toBe(200);
    res.body.forEach((e) => expect(e.estate).toContain("Nairobi"));
  });

  it.each([
    ["an unknown sort value", "sort=banana"],
    ["sort=proximity with no coordinates", "sort=proximity"],
    ["sort=proximity with only lat", "sort=proximity&lat=-1.28"],
    ["a non-numeric lat", "lat=abc&lng=36.8"],
    ["a non-numeric lng", "lat=-1.28&lng=xyz"],
    ["a lat beyond 90", "sort=proximity&lat=95&lng=36.8"],
    ["a lng beyond 180", "sort=proximity&lat=-1.28&lng=181"],
    ["an empty lat", "sort=proximity&lat=&lng=36.8"],
  ])("rejects %s with 400", async (_l, qs) => {
    const res = await request(app).get(`/api/experts?${qs}`);
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe("string");
  });

  it("does not list the admin account or students with no location", async () => {
    await request(app).post("/api/auth/signup").send({ name: "No Location", username: "noloc", phone: "0700123456", password: "abcd" });
    const res = await request(app).get("/api/experts");
    expect(res.body.some((e) => e.name === "Admin" || e.name === "No Location")).toBe(false);
  });
});

describe("GET /api/experts/:id", () => {
  it("returns one expert in the contract's Expert shape", async () => {
    const res = await request(app).get("/api/experts/13");
    expect(res.status).toBe(200);
    isExpertShape(res.body);
    expect(res.body).toMatchObject({ id: 13, name: "Amina Farah" });
    expect(res.body.skills).toContain("Agronomy");
  });

  it.each([["99999"], ["abc"], ["-1"], ["0"], ["15"]])("returns 404 with { error } for id %s (missing / invalid / admin)", async (id) => {
    const res = await request(app).get(`/api/experts/${id}`);
    expect(res.status).toBe(404);
    expect(typeof res.body.error).toBe("string");
  });

  it("returns 404 for a real student who has no location yet (not an expert)", async () => {
    const list = await request(app).get("/api/users");
    const noloc = (await login("noloc", "abcd")).user;
    expect((await request(app).get(`/api/experts/${noloc.id}`)).status).toBe(404);
    expect(list.status).toBe(200);
  });
});

describe("GET /api/experts/:id/availability", () => {
  it("returns an ARRAY of Availability objects: date, startTime (HH:MM:SS), durationMinutes", async () => {
    const res = await request(app).get("/api/experts/13/availability");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(28); // 7 days x 4 daily slots
    res.body.forEach((slot) => {
      expect(slot.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(slot.startTime).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      expect(Number.isInteger(slot.durationMinutes)).toBe(true);
      expect(slot.durationMinutes).toBeGreaterThan(0);
    });
  });

  it("slots are in the future, never in the past", async () => {
    const res = await request(app).get("/api/experts/13/availability");
    const today = new Date().toISOString().slice(0, 10);
    res.body.forEach((s) => expect(s.date > today).toBe(true));
  });

  it("a booked session removes exactly that slot", async () => {
    const before = (await request(app).get("/api/experts/13/availability")).body;
    const slot = before[0];
    const { token } = await login("billamani");
    const booked = await request(app).post("/api/sessions").set(auth(token))
      .send({ with: "Amina Farah", skill: "Soil Health", date: slot.date, time: slot.startTime.slice(0, 5) });
    expect(booked.status).toBe(201);
    const after = (await request(app).get("/api/experts/13/availability")).body;
    expect(after.length).toBe(before.length - 1);
    expect(after.some((s) => s.date === slot.date && s.startTime === slot.startTime)).toBe(false);
  });

  it.each([["99999"], ["abc"], ["15"]])("returns 404 for expert %s", async (id) => {
    const res = await request(app).get(`/api/experts/${id}/availability`);
    expect(res.status).toBe(404);
    expect(typeof res.body.error).toBe("string");
  });
});

describe("GET /api/experts/:id/reviews", () => {
  it("returns a ReviewSummary: rating, reviewCount, completedSessions", async () => {
    const res = await request(app).get("/api/experts/13/reviews");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ rating: 4.9, reviewCount: 18, completedSessions: 9 });
  });

  it("uses exactly the contract's field names (no legacy 'reviews'/'completedSwaps')", async () => {
    const res = await request(app).get("/api/experts/13/reviews");
    expect(res.body).not.toHaveProperty("reviews");
    expect(res.body).not.toHaveProperty("completedSwaps");
    expect(typeof res.body.rating).toBe("number");
    expect(Number.isInteger(res.body.reviewCount)).toBe(true);
    expect(Number.isInteger(res.body.completedSessions)).toBe(true);
  });

  it.each([["99999"], ["abc"], ["15"]])("returns 404 for expert %s", async (id) => {
    const res = await request(app).get(`/api/experts/${id}/reviews`);
    expect(res.status).toBe(404);
    expect(typeof res.body.error).toBe("string");
  });
});
