import { request, app, login, auth } from "./helpers.js";

describe("profile routes require login", () => {
  it.each([
    ["get", "/api/profile"],
    ["patch", "/api/profile"],
    ["post", "/api/profile/skills"],
    ["delete", "/api/profile/skills/offer/Python"],
    ["patch", "/api/profile/coins"],
  ])("%s %s -> 401 with no token", async (method, url) => {
    const res = await request(app)[method](url).send({});
    expect(res.status).toBe(401);
  });
});

describe("GET /api/profile", () => {
  it("returns my skills, coin balance and coin history in the documented shape", async () => {
    const { token } = await login("billamani");
    const res = await request(app).get("/api/profile").set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.offers).toEqual(expect.arrayContaining(["Python", "Web Development"]));
    expect(Array.isArray(res.body.wants)).toBe(true);
    expect(typeof res.body.coins).toBe("number");
    expect(res.body.coins).toBe(12);
    expect(res.body.coinHistory.length).toBeGreaterThan(0);
    expect(res.body.coinHistory[0]).toEqual({
      id: expect.any(Number), action: expect.any(String), change: expect.any(Number), date: expect.any(String),
    });
  });

  it("returns only MY data (two users get different profiles)", async () => {
    const a = await request(app).get("/api/profile").set(auth((await login("billamani")).token));
    const b = await request(app).get("/api/profile").set(auth((await login("aminafarah")).token));
    expect(b.body.offers).toContain("Agronomy");
    expect(a.body.offers).not.toContain("Agronomy");
  });
});

describe("PATCH /api/profile", () => {
  it("updates my dept and estate (200) and returns my safe user object", async () => {
    const { token } = await login("jessica");
    const res = await request(app).patch("/api/profile").set(auth(token)).send({ dept: "Product Design", estate: "Kilimani" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ username: "jessica", dept: "Product Design", estate: "Kilimani" });
    expect(res.body).not.toHaveProperty("password_hash");
  });

  it("is idempotent: same PATCH twice -> same end state", async () => {
    const { token } = await login("jessica");
    const a = await request(app).patch("/api/profile").set(auth(token)).send({ dept: "Same" });
    const b = await request(app).patch("/api/profile").set(auth(token)).send({ dept: "Same" });
    expect(b.body).toEqual(a.body);
  });

  it("400 when no editable field is sent", async () => {
    const { token } = await login("jessica");
    const res = await request(app).patch("/api/profile").set(auth(token)).send({});
    expect(res.status).toBe(400);
  });

  it("does NOT let a user promote themselves: role in the body is ignored / rejected", async () => {
    const { token } = await login("jessica");
    const only = await request(app).patch("/api/profile").set(auth(token)).send({ role: "admin" });
    expect(only.status).toBe(400); // nothing editable in that body
    const mixed = await request(app).patch("/api/profile").set(auth(token)).send({ role: "admin", dept: "Sneaky" });
    expect(mixed.status).toBe(200);
    expect(mixed.body.role).toBe("user");
  });

  it.each([["dept", 42], ["dept", ["a"]], ["estate", { x: 1 }], ["estate", true]])("rejects %s = %p (wrong type) with 400", async (field, value) => {
    const { token } = await login("jessica");
    const res = await request(app).patch("/api/profile").set(auth(token)).send({ [field]: value });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(new RegExp(field, "i"));
  });
});

describe("POST /api/profile/skills", () => {
  it("adds an OFFERED skill: 201, skill listed, and I earn +1 coin", async () => {
    const { token } = await login("lelouch");
    const before = (await request(app).get("/api/profile").set(auth(token))).body;
    const res = await request(app).post("/api/profile/skills").set(auth(token)).send({ type: "offer", value: "Chess Strategy" });
    expect(res.status).toBe(201);
    expect(res.body.offers).toContain("Chess Strategy");
    expect(res.body.coins).toBe(before.coins + 1);
    expect(res.body.coinHistory[0]).toMatchObject({ action: "Added skill: Chess Strategy", change: 1 });
  });

  it("adds a WANTED skill: 201 and no coin reward", async () => {
    const { token } = await login("lelouch");
    const before = (await request(app).get("/api/profile").set(auth(token))).body;
    const res = await request(app).post("/api/profile/skills").set(auth(token)).send({ type: "want", value: "Calligraphy" });
    expect(res.status).toBe(201);
    expect(res.body.wants).toContain("Calligraphy");
    expect(res.body.coins).toBe(before.coins);
  });

  it("rejects a duplicate (case-insensitive) with 409 and does not pay a second coin", async () => {
    const { token } = await login("lelouch");
    const before = (await request(app).get("/api/profile").set(auth(token))).body;
    const res = await request(app).post("/api/profile/skills").set(auth(token)).send({ type: "offer", value: "chess strategy" });
    expect(res.status).toBe(409);
    expect((await request(app).get("/api/profile").set(auth(token))).body.coins).toBe(before.coins);
  });

  it.each([
    ["missing value", { type: "offer" }],
    ["empty value", { type: "offer", value: "" }],
    ["whitespace-only value", { type: "offer", value: "   " }],
    ["numeric value", { type: "offer", value: 123 }],
    ["object value", { type: "offer", value: { a: 1 } }],
    ["missing type", { value: "Cooking" }],
    ["invalid type", { type: "teach", value: "Cooking" }],
  ])("rejects %s with 400 (never a 500)", async (_label, body) => {
    const { token } = await login("lelouch");
    const res = await request(app).post("/api/profile/skills").set(auth(token)).send(body);
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe("string");
  });

  it("enforces a 60-character limit (60 ok, 61 rejected)", async () => {
    const { token } = await login("lelouch");
    const ok = await request(app).post("/api/profile/skills").set(auth(token)).send({ type: "want", value: "a".repeat(60) });
    const tooLong = await request(app).post("/api/profile/skills").set(auth(token)).send({ type: "want", value: "b".repeat(61) });
    expect(ok.status).toBe(201);
    expect(tooLong.status).toBe(400);
  });

  it("trims surrounding whitespace before saving", async () => {
    const { token } = await login("lelouch");
    const res = await request(app).post("/api/profile/skills").set(auth(token)).send({ type: "want", value: "  Origami  " });
    expect(res.status).toBe(201);
    expect(res.body.wants).toContain("Origami");
  });

  it("a rejected whitespace skill did not leave a blank skill behind", async () => {
    const { token } = await login("lelouch");
    const p = (await request(app).get("/api/profile").set(auth(token))).body;
    expect([...p.offers, ...p.wants].some((s) => s.trim() === "")).toBe(false);
  });
});

describe("DELETE /api/profile/skills/:type/:value", () => {
  it("removes my skill (200) and returns the updated profile", async () => {
    const { token } = await login("lelouch");
    const res = await request(app).delete("/api/profile/skills/want/Calligraphy").set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.wants).not.toContain("Calligraphy");
  });

  it("handles URL-encoded skill names (spaces, &)", async () => {
    const { token } = await login("lelouch");
    const res = await request(app).delete(`/api/profile/skills/offer/${encodeURIComponent("Strategy & Planning")}`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.offers).not.toContain("Strategy & Planning");
  });

  it("removing a skill that isn't there is a harmless 200 (documented in CONTRACT_DEVIATIONS.md)", async () => {
    const { token } = await login("lelouch");
    const res = await request(app).delete("/api/profile/skills/offer/NeverHadThis").set(auth(token));
    expect(res.status).toBe(200);
  });

  it("rejects an invalid type with 400", async () => {
    const { token } = await login("lelouch");
    const res = await request(app).delete("/api/profile/skills/banana/Python").set(auth(token));
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/profile/coins", () => {
  it("adds coins and records a history entry with my reason", async () => {
    const { token } = await login("narutouzumaki");
    const before = (await request(app).get("/api/profile").set(auth(token))).body.coins;
    const res = await request(app).patch("/api/profile/coins").set(auth(token)).send({ delta: 5, reason: "Taught a class" });
    expect(res.status).toBe(200);
    expect(res.body.coins).toBe(before + 5);
    expect(res.body.coinHistory[0]).toMatchObject({ action: "Taught a class", change: 5 });
  });

  it("spends coins with a negative delta", async () => {
    const { token } = await login("narutouzumaki");
    const before = (await request(app).get("/api/profile").set(auth(token))).body.coins;
    const res = await request(app).patch("/api/profile/coins").set(auth(token)).send({ delta: -2 });
    expect(res.status).toBe(200);
    expect(res.body.coins).toBe(before - 2);
  });

  it("refuses to overdraw (400) and leaves the balance untouched", async () => {
    const { token } = await login("narutouzumaki");
    const before = (await request(app).get("/api/profile").set(auth(token))).body;
    const res = await request(app).patch("/api/profile/coins").set(auth(token)).send({ delta: -1000000 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/insufficient/i);
    const after = (await request(app).get("/api/profile").set(auth(token))).body;
    expect(after.coins).toBe(before.coins);
    expect(after.coinHistory.length).toBe(before.coinHistory.length); // no ghost history row
  });

  it.each([["missing", {}], ["a string", { delta: "5" }], ["null", { delta: null }], ["an object", { delta: {} }]])("rejects delta that is %s with 400", async (_l, body) => {
    const { token } = await login("narutouzumaki");
    const res = await request(app).patch("/api/profile/coins").set(auth(token)).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/delta/i);
  });

  it("is NOT idempotent by design: the same +1 twice adds 2 (a transaction, see CONTRACT_DEVIATIONS.md)", async () => {
    const { token } = await login("narutouzumaki");
    const start = (await request(app).get("/api/profile").set(auth(token))).body.coins;
    await request(app).patch("/api/profile/coins").set(auth(token)).send({ delta: 1 });
    const end = await request(app).patch("/api/profile/coins").set(auth(token)).send({ delta: 1 });
    expect(end.body.coins).toBe(start + 2);
  });

  it("a brand-new signup starts with 5 welcome coins and can earn more", async () => {
    const signup = await request(app).post("/api/auth/signup").send({ name: "Coin Tester", username: "cointester", phone: "0711111111", password: "abcd" });
    const token = signup.body.token;
    expect((await request(app).get("/api/profile").set(auth(token))).body.coins).toBe(5);
    const res = await request(app).patch("/api/profile/coins").set(auth(token)).send({ delta: 3 });
    expect(res.body.coins).toBe(8);
  });
});
