import { request, app, login, auth } from "./helpers.js";

let token;
beforeAll(async () => { ({ token } = await login("billamani")); });

const valid = (over = {}) => ({ with: "Jessica", skill: "UI/UX basics", date: "2026-10-01", time: "10:30", dur: 45, color: "#1FD4A0", ...over });

describe("sessions require login", () => {
  it.each([["get", "/api/sessions"], ["post", "/api/sessions"], ["patch", "/api/sessions/1"]])("%s %s -> 401 with no token", async (m, url) => {
    expect((await request(app)[m](url).send({})).status).toBe(401);
  });
});

describe("GET /api/sessions", () => {
  it("returns sessions in the documented shape (reviewed is a real boolean)", async () => {
    const res = await request(app).get("/api/sessions").set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(3);
    expect(res.body[0]).toEqual({
      id: expect.any(Number), with: expect.any(String), skill: expect.any(String),
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), time: expect.stringMatching(/^\d{2}:\d{2}$/),
      dur: expect.any(Number), color: expect.stringMatching(/^#[0-9A-Fa-f]{6}$/), reviewed: false,
    });
  });

  it("is sorted by date then time", async () => {
    const res = await request(app).get("/api/sessions").set(auth(token));
    const keys = res.body.map((s) => `${s.date} ${s.time}`);
    expect(keys).toEqual([...keys].sort());
  });
});

describe("POST /api/sessions", () => {
  it("books a session: 201 and the full session back", async () => {
    const res = await request(app).post("/api/sessions").set(auth(token)).send(valid());
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(Number), with: "Jessica", skill: "UI/UX basics", date: "2026-10-01", time: "10:30", dur: 45, color: "#1FD4A0", reviewed: false });
  });

  it("the booking really exists afterwards (re-fetch)", async () => {
    const created = await request(app).post("/api/sessions").set(auth(token)).send(valid({ skill: "Findable skill" }));
    const list = await request(app).get("/api/sessions").set(auth(token));
    expect(list.body.find((s) => s.id === created.body.id)?.skill).toBe("Findable skill");
  });

  it("applies defaults when dur and color are omitted (60 minutes, emerald)", async () => {
    const res = await request(app).post("/api/sessions").set(auth(token)).send({ with: "K.Dot", skill: "Beats", date: "2026-10-02", time: "09:00" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ dur: 60, color: "#10B981" });
  });

  it.each(["with", "skill", "date", "time"])("rejects a missing %s with 400", async (field) => {
    const res = await request(app).post("/api/sessions").set(auth(token)).send(valid({ [field]: undefined }));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it.each([
    ["dur as a string", { dur: "60" }],
    ["dur = 0", { dur: 0 }],
    ["dur negative", { dur: -30 }],
    ["dur a decimal", { dur: 1.5 }],
    ["dur absurdly long (over 24h)", { dur: 5000 }],
    ["with as a number", { with: 5 }],
    ["skill as an object", { skill: { a: 1 } }],
    ["whitespace-only skill", { skill: "   " }],
    ["a malformed date", { date: "01/10/2026" }],
    ["an impossible date", { date: "2026-02-30" }],
    ["a malformed time", { time: "25:99" }],
    ["a time with seconds", { time: "10:30:00" }],
    ["a non-hex color", { color: "green" }],
  ])("rejects %s with 400 (never a 500)", async (_l, over) => {
    const res = await request(app).post("/api/sessions").set(auth(token)).send(valid(over));
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe("string");
  });

  it("boundary values are accepted: 00:00, 23:59 and dur 1", async () => {
    const a = await request(app).post("/api/sessions").set(auth(token)).send(valid({ time: "00:00", dur: 1 }));
    const b = await request(app).post("/api/sessions").set(auth(token)).send(valid({ time: "23:59", dur: 1440 }));
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
  });

  it("a rejected booking leaves nothing behind", async () => {
    const before = (await request(app).get("/api/sessions").set(auth(token))).body.length;
    await request(app).post("/api/sessions").set(auth(token)).send(valid({ dur: "bad" }));
    expect((await request(app).get("/api/sessions").set(auth(token))).body.length).toBe(before);
  });
});

describe("PATCH /api/sessions/:id (mark reviewed)", () => {
  it("marks a session reviewed (200) and it persists", async () => {
    const res = await request(app).patch("/api/sessions/1").set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 1, reviewed: true });
    const list = await request(app).get("/api/sessions").set(auth(token));
    expect(list.body.find((s) => s.id === 1).reviewed).toBe(true);
  });

  it("is idempotent: reviewing twice leaves the same end state", async () => {
    const a = await request(app).patch("/api/sessions/2").set(auth(token));
    const b = await request(app).patch("/api/sessions/2").set(auth(token));
    expect(b.status).toBe(200);
    expect(b.body).toEqual(a.body);
  });

  it("returns 404 for a session that does not exist", async () => {
    const res = await request(app).patch("/api/sessions/99999").set(auth(token));
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it("returns 404 (not a crash) for a non-numeric id", async () => {
    expect((await request(app).patch("/api/sessions/abc").set(auth(token))).status).toBe(404);
  });
});
