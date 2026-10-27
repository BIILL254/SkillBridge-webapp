// Week 9 security self-audit (Part D) turned into regression tests: each test
// pins down something the audit checked or fixed.
import express from "express";
import supertest from "supertest";
import { request, app, login, auth } from "./helpers.js";
import { errorHandler } from "../server/middleware/errorHandler.js";

describe("sensitive fields never appear in responses", () => {
  // a stored hash, or any key called exactly "password" / "passwordHash" (the harmless
  // boolean "mustChangePassword" flag is allowed)
  const FORBIDDEN = /"password"|"passwordHash"|"password_hash"|\$2[aby]\$/i;

  it("no public or student endpoint returns a password, hash or token", async () => {
    const { token } = await login("billamani");
    const urls = ["/api/users", "/api/users/1", "/api/experts", "/api/experts/13", "/api/experts/13/reviews",
      "/api/experts/13/availability", "/api/skills", "/api/profile", "/api/requests", "/api/sessions", "/api/auth/me",
      "/api/logistics/stations", "/api/logistics/estates"];
    for (const url of urls) {
      const res = await request(app).get(url).set(auth(token));
      expect(res.status).toBe(200);
      const text = JSON.stringify(res.body);
      expect(text).not.toMatch(FORBIDDEN);
      expect(text).not.toContain(token);
    }
  });

  it("the admin user list contains no password hash", async () => {
    const { token } = await login("admin", process.env.ADMIN_PASSWORD || "1234");
    const res = await request(app).get("/api/admin/users").set(auth(token));
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(FORBIDDEN);
    res.body.forEach((u) => expect(Object.keys(u)).not.toContain("password_hash"));
  });

  it("the public student and expert listings do not expose phone numbers or usernames", async () => {
    for (const url of ["/api/users", "/api/experts"]) {
      const res = await request(app).get(url);
      res.body.forEach((u) => {
        expect(u.phone).toBeUndefined();
        expect(u.username).toBeUndefined();
        expect(u.role).toBeUndefined();
      });
    }
  });

  it("login failure does not reveal whether the username exists", async () => {
    const a = await request(app).post("/api/auth/login").send({ username: "billamani", password: "wrong-pw" });
    const b = await request(app).post("/api/auth/login").send({ username: "nobody-here", password: "wrong-pw" });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body).toEqual(b.body);
  });
});

describe("other people's data (changing an id in the URL)", () => {
  it("GET /api/sessions returns only MY sessions", async () => {
    const bill = await login("billamani");
    const jess = await login("jessica");
    const mine = await request(app).get("/api/sessions").set(auth(bill.token));
    const hers = await request(app).get("/api/sessions").set(auth(jess.token));
    expect(mine.body.length).toBe(3); // the seeded demo sessions belong to Bill
    expect(hers.body).toEqual([]);
  });

  it("a new session is visible to its owner only", async () => {
    const jess = await login("jessica");
    const bill = await login("billamani");
    const made = await request(app).post("/api/sessions").set(auth(jess.token))
      .send({ with: "K.Dot", skill: "Private lesson", date: "2026-12-01", time: "09:00" });
    expect(made.status).toBe(201);
    expect(made.body.userId).toBeUndefined(); // the owner column is internal
    const billsList = await request(app).get("/api/sessions").set(auth(bill.token));
    expect(billsList.body.find((s) => s.id === made.body.id)).toBeUndefined();
    const hersList = await request(app).get("/api/sessions").set(auth(jess.token));
    expect(hersList.body.find((s) => s.id === made.body.id)).toBeDefined();
  });

  it("PATCH /api/sessions/:id on someone else's session is 403 and changes nothing", async () => {
    const jess = await login("jessica");
    const bill = await login("billamani");
    const res = await request(app).patch("/api/sessions/1").set(auth(jess.token)).send({ reviewed: true });
    expect(res.status).toBe(403);
    const billsList = await request(app).get("/api/sessions").set(auth(bill.token));
    expect(billsList.body.find((s) => s.id === 1).reviewed).toBe(false);
  });

  it("PATCH on a session that does not exist is 404", async () => {
    const { token } = await login("billamani");
    expect((await request(app).patch("/api/sessions/99999").set(auth(token)).send({})).status).toBe(404);
  });

  it("the owner can still mark their own session reviewed", async () => {
    const { token } = await login("billamani");
    const res = await request(app).patch("/api/sessions/2").set(auth(token)).send({ reviewed: true });
    expect(res.status).toBe(200);
    expect(res.body.reviewed).toBe(true);
  });

  it("requests: another user cannot read, change or delete my requests", async () => {
    const bill = await login("billamani");
    const k = await login("kdot");
    const list = await request(app).get("/api/requests").set(auth(k.token));
    expect(list.body.find((r) => r.id === 1)).toBeUndefined(); // request 1 is Jessica -> Bill
    expect((await request(app).patch("/api/requests/1").set(auth(k.token)).send({ status: "declined" })).status).toBe(403);
    expect((await request(app).delete("/api/requests/1").set(auth(k.token))).status).toBe(403);
    expect((await request(app).get("/api/requests").set(auth(bill.token))).body.find((r) => r.id === 1)).toBeDefined();
  });

  it("a student cannot reach the admin endpoints", async () => {
    const { token } = await login("billamani");
    expect((await request(app).get("/api/admin/users").set(auth(token))).status).toBe(403);
    expect((await request(app).delete("/api/admin/users/2").set(auth(token))).status).toBe(403);
  });

  it("the availability endpoint shows taken slots but not who took them", async () => {
    const res = await request(app).get("/api/experts/13/availability");
    res.body.forEach((slot) => expect(Object.keys(slot).sort()).toEqual(["date", "durationMinutes", "startTime"]));
  });
});

describe("error responses do not give internals away", () => {
  const build = (thrower) => {
    const mini = express();
    mini.get("/boom", (req, res, next) => next(thrower()));
    mini.use(errorHandler);
    return mini;
  };

  it("an unexpected error becomes a generic 500 with no message, SQL, table or path", async () => {
    const mini = build(() => new Error("SQLITE_CONSTRAINT: UNIQUE constraint failed: users.username at /app/server/db.js:123"));
    const res = await supertest(mini).get("/boom");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Something went wrong" });
    expect(JSON.stringify(res.body)).not.toMatch(/SQLITE|users\.username|db\.js|\/app\//);
    expect(res.text).not.toMatch(/at Object|node_modules|stack/i);
  });

  it("an error WE raised on purpose (with a status) keeps its message", async () => {
    const mini = build(() => Object.assign(new Error("That username is already taken"), { status: 409 }));
    const res = await supertest(mini).get("/boom");
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "That username is already taken" });
  });

  it("malformed JSON gets a fixed message, not the parser's internals", async () => {
    const res = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{ \"a\": oops");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Request body is not valid JSON" });
  });

  it("an oversized body is refused with 413", async () => {
    const res = await request(app).post("/api/auth/login").set("Content-Type", "application/json")
      .send(JSON.stringify({ username: "a".repeat(200_000), password: "x" }));
    expect(res.status).toBe(413);
  });

  it("a duplicate signup returns a clean 409, no database wording", async () => {
    const body = { name: "Dup Test", username: "duptest", phone: "0711000111", password: "abcd" };
    await request(app).post("/api/auth/signup").send(body);
    const res = await request(app).post("/api/auth/signup").send(body);
    expect(res.status).toBe(409);
    expect(JSON.stringify(res.body)).not.toMatch(/sqlite|constraint|users\./i);
  });

  it("SQL-looking input is treated as plain data (no injection, no 500)", async () => {
    const usersBefore = (await request(app).get("/api/users")).body.length;
    const a = await request(app).post("/api/auth/login").send({ username: "' OR '1'='1", password: "' OR '1'='1" });
    expect(a.status).toBe(401);
    const b = await request(app).get("/api/skills?tag=" + encodeURIComponent("x' OR 1=1 --"));
    expect(b.status).toBe(200);
    expect(b.body).toEqual([]);
    const c = await request(app).get("/api/experts?estate=" + encodeURIComponent("'; DROP TABLE users; --"));
    expect(c.status).toBe(200);
    expect((await request(app).get("/api/users")).body.length).toBe(usersBefore); // table still intact
  });
});

describe("write endpoints ignore extra fields", () => {
  it("signup cannot set role, id, coins or must-change-password", async () => {
    const res = await request(app).post("/api/auth/signup").send({
      name: "Mass Assign", username: "massassign", phone: "0722000222", password: "abcd",
      role: "admin", id: 9999, coins: 1000000, rating: 5, mustChangePassword: true, must_change_password: 1,
    });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("user");
    expect(res.body.user.id).not.toBe(9999);
    expect(res.body.user.rating).toBe(0);
    expect(res.body.user.mustChangePassword).toBe(false);
    const profile = await request(app).get("/api/profile").set(auth(res.body.token));
    expect(profile.body.coins).toBe(5); // only the welcome bonus
    const asAdmin = await request(app).get("/api/admin/users").set(auth(res.body.token));
    expect(asAdmin.status).toBe(403);
  });

  it("PATCH /api/profile only changes dept and estate; role, rating and id are ignored", async () => {
    const { token, user } = await login("walterwhite");
    const res = await request(app).patch("/api/profile").set(auth(token))
      .send({ dept: "Chemistry", role: "admin", rating: 5, id: 1, username: "hacked" });
    expect(res.status).toBe(200);
    expect(res.body.dept).toBe("Chemistry");
    expect(res.body.role).toBe("user");
    expect(res.body.id).toBe(user.id);
    expect(res.body.username).toBe(user.username);
    expect((await request(app).get("/api/admin/users").set(auth(token))).status).toBe(403);
  });

  it("a swap request cannot spoof the sender: fromId comes from the token", async () => {
    const { token, user } = await login("kdot");
    const res = await request(app).post("/api/requests").set(auth(token))
      .send({ toId: 1, want: "Web Development", type: "swap", msg: "hi", fromId: 3, status: "accepted", id: 5000 });
    expect(res.status).toBe(201);
    expect(res.body.fromId).toBe(user.id);
    expect(res.body.status).toBe("sent");
    expect(res.body.id).not.toBe(5000);
  });

  it("a session cannot be created for another owner via the body", async () => {
    const jess = await login("jessica");
    const bill = await login("billamani");
    const res = await request(app).post("/api/sessions").set(auth(jess.token))
      .send({ with: "K.Dot", skill: "Spoof", date: "2026-12-02", time: "10:00", userId: bill.user.id, user_id: bill.user.id });
    expect(res.status).toBe(201);
    const billsList = await request(app).get("/api/sessions").set(auth(bill.token));
    expect(billsList.body.find((s) => s.id === res.body.id)).toBeUndefined();
  });
});

describe("coins: a user cannot print money", () => {
  it("rejects a huge grant, a decimal grant and an over-long reason", async () => {
    const { token } = await login("jordanlee");
    const before = (await request(app).get("/api/profile").set(auth(token))).body.coins;
    expect((await request(app).patch("/api/profile/coins").set(auth(token)).send({ delta: 1000000 })).status).toBe(400);
    expect((await request(app).patch("/api/profile/coins").set(auth(token)).send({ delta: 11 })).status).toBe(400);
    expect((await request(app).patch("/api/profile/coins").set(auth(token)).send({ delta: 1.5 })).status).toBe(400);
    expect((await request(app).patch("/api/profile/coins").set(auth(token)).send({ delta: 1, reason: "x".repeat(500) })).status).toBe(400);
    expect((await request(app).patch("/api/profile/coins").set(auth(token)).send({ delta: 1, reason: { a: 1 } })).status).toBe(400);
    expect((await request(app).get("/api/profile").set(auth(token))).body.coins).toBe(before);
  });

  it("normal awards of 1-10 coins still work", async () => {
    const { token } = await login("jordanlee");
    const before = (await request(app).get("/api/profile").set(auth(token))).body.coins;
    const res = await request(app).patch("/api/profile/coins").set(auth(token)).send({ delta: 10, reason: "Taught" });
    expect(res.status).toBe(200);
    expect(res.body.coins).toBe(before + 10);
  });
});
