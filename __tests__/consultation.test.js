// Week 14 hardening: the consultation booking (AgroConnect's POST) keeps stored text a sane size.

import { request, app } from "./helpers.js";

const good = { farmerName: "Wanjiru Kamau", topic: "Irrigation Systems", expertId: 13, date: "2026-12-01T10:00:00Z" };

describe("POST /api/requests (consultation) text limits", () => {
  test("a normal booking is still 201", async () => {
    const res = await request(app).post("/api/requests").send(good);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("Pending");
  });

  test("the longest allowed values are accepted", async () => {
    const res = await request(app)
      .post("/api/requests")
      .send({ ...good, farmerName: "a".repeat(120), topic: "t".repeat(200) });
    expect(res.status).toBe(201);
  });

  test("a farmerName over 120 characters is 400", async () => {
    const res = await request(app).post("/api/requests").send({ ...good, farmerName: "a".repeat(121) });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at most 120/);
  });

  test("a topic over 200 characters is 400", async () => {
    const res = await request(app).post("/api/requests").send({ ...good, topic: "t".repeat(201) });
    expect(res.status).toBe(400);
  });

  test("a 50 KB name is 400, not stored", async () => {
    const res = await request(app).post("/api/requests").send({ ...good, farmerName: "a".repeat(50_000) });
    expect(res.status).toBe(400);
  });
});
