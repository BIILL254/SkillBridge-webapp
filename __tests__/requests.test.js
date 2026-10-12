import { request, app, login, auth } from "./helpers.js";

let bill, jess, walter;
beforeAll(async () => {
  bill = await login("billamani");   // id 1, recipient of all 3 seeded requests
  jess = await login("jessica");     // id 2, sender of seeded request 1
  walter = await login("walterwhite"); // id 6, not involved in any seeded request
});

const swap = (over = {}) => ({ toId: 2, offer: "Python", want: "UI/UX Design", type: "swap", msg: "Let's swap!", ...over });

describe("GET /api/requests", () => {
  it("requires login (401)", async () => {
    expect((await request(app).get("/api/requests")).status).toBe(401);
  });

  it("returns requests in the documented shape", async () => {
    const res = await request(app).get("/api/requests").set(auth(bill.token));
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(3);
    expect(res.body[0]).toEqual({
      id: expect.any(Number), fromId: expect.any(Number), toId: expect.any(Number),
      offer: expect.anything(), want: expect.any(String), type: expect.any(String),
      msg: expect.any(String), time: expect.any(String), status: expect.any(String),
    });
  });

  it("only returns requests I'm part of (sender or recipient)", async () => {
    const res = await request(app).get("/api/requests").set(auth(jess.token));
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach((r) => expect([r.fromId, r.toId]).toContain(jess.user.id));
  });

  it("edge case: a user with no requests gets an empty array, not an error", async () => {
    const res = await request(app).get("/api/requests").set(auth(walter.token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("POST /api/requests (student swap / coin request)", () => {
  it("creates a swap request: 201, sender taken from my token, status 'sent'", async () => {
    const res = await request(app).post("/api/requests").set(auth(bill.token)).send(swap());
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ fromId: bill.user.id, toId: 2, offer: "Python", want: "UI/UX Design", type: "swap", msg: "Let's swap!", status: "sent" });
    expect(typeof res.body.id).toBe("number");
  });

  it("the created request really exists afterwards (re-fetch)", async () => {
    const created = await request(app).post("/api/requests").set(auth(bill.token)).send(swap({ msg: "find me later" }));
    const list = await request(app).get("/api/requests").set(auth(bill.token));
    expect(list.body.find((r) => r.id === created.body.id)?.msg).toBe("find me later");
  });

  it("cannot spoof the sender: a fromId in the body is ignored", async () => {
    const res = await request(app).post("/api/requests").set(auth(bill.token)).send(swap({ fromId: 6 }));
    expect(res.status).toBe(201);
    expect(res.body.fromId).toBe(bill.user.id);
  });

  it("creates a coin request with no offer", async () => {
    const res = await request(app).post("/api/requests").set(auth(bill.token)).send({ toId: 3, want: "Sales", type: "coin", msg: "Paid help?" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ type: "coin", offer: null });
  });

  it("requires login (401)", async () => {
    expect((await request(app).post("/api/requests").send(swap())).status).toBe(401);
  });

  it.each([
    ["msg", swap({ msg: undefined })],
    ["want", swap({ want: undefined })],
    ["type", swap({ type: undefined })],
  ])("rejects a missing %s with 400", async (_f, body) => {
    const res = await request(app).post("/api/requests").set(auth(bill.token)).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it.each([["consult"], ["banana"], [42]])("rejects type = %p with 400", async (type) => {
    const res = await request(app).post("/api/requests").set(auth(bill.token)).send(swap({ type }));
    expect(res.status).toBe(400);
  });

  it.each([
    ["msg as a number", swap({ msg: 123 })],
    ["msg as an object", swap({ msg: { a: 1 } })],
    ["want as an object", swap({ want: { a: 1 } })],
    ["offer as an array", swap({ offer: ["x"] })],
    ["whitespace-only msg", swap({ msg: "   " })],
  ])("rejects %s with 400 (never a 500)", async (_l, body) => {
    const res = await request(app).post("/api/requests").set(auth(bill.token)).send(body);
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe("string");
  });

  it("rejects a recipient that doesn't exist with 400", async () => {
    const res = await request(app).post("/api/requests").set(auth(bill.token)).send(swap({ toId: 99999 }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/toId/i);
  });

  it("a rejected request leaves nothing behind (no partial write)", async () => {
    const before = (await request(app).get("/api/requests").set(auth(bill.token))).body.length;
    await request(app).post("/api/requests").set(auth(bill.token)).send(swap({ want: undefined }));
    const after = (await request(app).get("/api/requests").set(auth(bill.token))).body.length;
    expect(after).toBe(before);
  });
});

describe("POST /api/requests (AgroConnect consultation booking, no login)", () => {
  const consult = (over = {}) => ({ farmerName: "John Kamau", topic: "Irrigation Systems", expertId: 13, date: "2026-09-20T10:00:00Z", ...over });

  it("creates a booking WITHOUT a token and answers in the contract shape { requestId, status }", async () => {
    const res = await request(app).post("/api/requests").send(consult());
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ requestId: expect.any(Number), status: "Pending" });
  });

  it("the booking lands in the expert's own request list", async () => {
    const created = await request(app).post("/api/requests").send(consult({ topic: "Soil Health" }));
    const amina = await login("aminafarah");
    const list = await request(app).get("/api/requests").set(auth(amina.token));
    const row = list.body.find((r) => r.id === created.body.requestId);
    expect(row).toMatchObject({ type: "consult", toId: 13, want: "Soil Health" });
    expect(row.msg).toContain("John Kamau");
  });

  it.each(["farmerName", "topic", "expertId", "date"])("rejects a missing %s with 400", async (field) => {
    const res = await request(app).post("/api/requests").send(consult({ [field]: undefined }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it.each([
    ["expertId as a string", { expertId: "13" }],
    ["expertId as a decimal", { expertId: 13.5 }],
    ["farmerName as a number", { farmerName: 5 }],
    ["topic as an object", { topic: { a: 1 } }],
    ["a date that isn't a date-time", { date: "next tuesday" }],
    ["a date-only value (contract says date-time)", { date: "2026-09-20" }],
    ["an impossible date", { date: "2026-13-45T99:99:99Z" }],
  ])("rejects %s with 400", async (_l, over) => {
    const res = await request(app).post("/api/requests").send(consult(over));
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe("string");
  });

  it("returns 404 for an expert that does not exist", async () => {
    const res = await request(app).post("/api/requests").send(consult({ expertId: 99999 }));
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/expert/i);
  });

  it("returns 404 for a real user who is not an expert (the admin account)", async () => {
    const res = await request(app).post("/api/requests").send(consult({ expertId: 15 }));
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/requests/:id", () => {
  it("the recipient can accept a request (200, updated row) and it persists", async () => {
    const res = await request(app).patch("/api/requests/1").set(auth(bill.token)).send({ status: "accepted" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 1, status: "accepted", toId: 1, fromId: 2 });
    const list = await request(app).get("/api/requests").set(auth(bill.token));
    expect(list.body.find((r) => r.id === 1).status).toBe("accepted");
  });

  it("is idempotent: accepting twice leaves the same end state", async () => {
    const a = await request(app).patch("/api/requests/2").set(auth(bill.token)).send({ status: "accepted" });
    const b = await request(app).patch("/api/requests/2").set(auth(bill.token)).send({ status: "accepted" });
    expect(b.status).toBe(200);
    expect(b.body).toEqual(a.body);
  });

  it("requires login (401)", async () => {
    expect((await request(app).patch("/api/requests/1").send({ status: "accepted" })).status).toBe(401);
  });

  it("rejects a missing status with 400", async () => {
    const res = await request(app).patch("/api/requests/1").set(auth(bill.token)).send({});
    expect(res.status).toBe(400);
  });

  it.each([["banana"], [42], [{ a: 1 }]])("rejects an invalid status %p with 400", async (status) => {
    const res = await request(app).patch("/api/requests/1").set(auth(bill.token)).send({ status });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/status/i);
  });

  it("returns 404 for a request that does not exist", async () => {
    const res = await request(app).patch("/api/requests/99999").set(auth(bill.token)).send({ status: "accepted" });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it("returns 403 when the request belongs to other people, and changes nothing", async () => {
    const res = await request(app).patch("/api/requests/3").set(auth(walter.token)).send({ status: "accepted" });
    expect(res.status).toBe(403);
    const after = (await request(app).get("/api/requests").set(auth(bill.token))).body.find((r) => r.id === 3);
    expect(after.status).toBe("sent");
  });
});

describe("DELETE /api/requests/:id", () => {
  it("deletes my request (204), and it is really gone (second delete -> 404)", async () => {
    const created = await request(app).post("/api/requests").set(auth(bill.token)).send(swap({ msg: "delete me" }));
    const id = created.body.id;
    const del = await request(app).delete(`/api/requests/${id}`).set(auth(bill.token));
    expect(del.status).toBe(204);
    expect(del.body).toEqual({});
    const list = await request(app).get("/api/requests").set(auth(bill.token));
    expect(list.body.some((r) => r.id === id)).toBe(false);
    expect((await request(app).delete(`/api/requests/${id}`).set(auth(bill.token))).status).toBe(404);
  });

  it("returns 404 for a request that never existed", async () => {
    expect((await request(app).delete("/api/requests/99999").set(auth(bill.token))).status).toBe(404);
  });

  it("returns 404 (not a crash) for a non-numeric id", async () => {
    expect((await request(app).delete("/api/requests/abc").set(auth(bill.token))).status).toBe(404);
  });

  it("requires login (401)", async () => {
    expect((await request(app).delete("/api/requests/3")).status).toBe(401);
  });

  it("returns 403 when the request belongs to other people, and it is NOT deleted", async () => {
    const res = await request(app).delete("/api/requests/3").set(auth(walter.token));
    expect(res.status).toBe(403);
    const still = (await request(app).get("/api/requests").set(auth(bill.token))).body.some((r) => r.id === 3);
    expect(still).toBe(true);
  });
});
