import { request, app, login, auth } from "./helpers.js";

let adminToken, adminUser, userToken;
beforeAll(async () => {
  ({ token: adminToken, user: adminUser } = await login("admin"));
  ({ token: userToken } = await login("billamani"));
});

describe("admin access control (every admin route)", () => {
  it.each([
    ["get", "/api/admin/users"],
    ["get", "/api/admin/audit-log"],
    ["post", "/api/admin/users"],
    ["patch", "/api/admin/users/1"],
    ["patch", "/api/admin/users/1/password"],
    ["delete", "/api/admin/users/1"],
  ])("%s %s -> 401 with no token", async (method, url) => {
    const res = await request(app)[method](url);
    expect(res.status).toBe(401);
  });

  it.each([
    ["get", "/api/admin/users"],
    ["get", "/api/admin/audit-log"],
    ["post", "/api/admin/users"],
    ["patch", "/api/admin/users/1"],
    ["delete", "/api/admin/users/2"],
  ])("%s %s -> 403 for a normal (non-admin) user", async (method, url) => {
    const res = await request(app)[method](url).set(auth(userToken)).send({});
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/admin/i);
  });
});

describe("GET /api/admin/users", () => {
  it("lists every account with full details and coin balance, never a password hash", async () => {
    const res = await request(app).get("/api/admin/users").set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(15);
    const bill = res.body.find((u) => u.username === "billamani");
    expect(bill).toMatchObject({ name: "Bill Amani", role: "user" });
    expect(typeof bill.phone).toBe("string");
    expect(typeof bill.coins).toBe("number");
    res.body.forEach((u) => expect(u).not.toHaveProperty("password_hash"));
  });
});

describe("POST /api/admin/users", () => {
  const valid = { name: "Test Kid", username: "testkid", phone: "0733445566", password: "temp1234" };

  it("registers a user (201), generating initials, and the account really exists afterwards", async () => {
    const res = await request(app).post("/api/admin/users").set(auth(adminToken)).send(valid);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ username: "testkid", initials: "T.K", role: "user" });
    const list = await request(app).get("/api/admin/users").set(auth(adminToken));
    expect(list.body.some((u) => u.username === "testkid")).toBe(true);
  });

  it("can register an admin account when role is 'admin'", async () => {
    const res = await request(app).post("/api/admin/users").set(auth(adminToken))
      .send({ ...valid, username: "secondadmin", role: "admin" });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe("admin");
  });

  it.each(["name", "username", "phone", "password"])("rejects a missing %s with 400", async (field) => {
    const body = { ...valid, username: `x${field}` };
    delete body[field];
    const res = await request(app).post("/api/admin/users").set(auth(adminToken)).send(body);
    expect(res.status).toBe(400);
  });

  it("rejects a duplicate username with 409", async () => {
    const res = await request(app).post("/api/admin/users").set(auth(adminToken)).send(valid);
    expect(res.status).toBe(409);
  });

  it("rejects a bad phone number with 400", async () => {
    const res = await request(app).post("/api/admin/users").set(auth(adminToken)).send({ ...valid, username: "badphone1", phone: "123" });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid role with 400 instead of silently creating a normal user", async () => {
    const res = await request(app).post("/api/admin/users").set(auth(adminToken)).send({ ...valid, username: "rolecheck", role: "superuser" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/role/i);
  });
});

describe("PATCH /api/admin/users/:id", () => {
  it("edits fields (200) and returns the updated user; re-fetching shows the change", async () => {
    const res = await request(app).patch("/api/admin/users/2").set(auth(adminToken)).send({ dept: "Advanced Design" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 2, dept: "Advanced Design" });
    const list = await request(app).get("/api/admin/users").set(auth(adminToken));
    expect(list.body.find((u) => u.id === 2).dept).toBe("Advanced Design");
  });

  it("is idempotent: the same PATCH twice leaves the same end state", async () => {
    const a = await request(app).patch("/api/admin/users/2").set(auth(adminToken)).send({ dept: "Same Dept" });
    const b = await request(app).patch("/api/admin/users/2").set(auth(adminToken)).send({ dept: "Same Dept" });
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(b.body).toEqual(a.body);
  });

  it("returns 404 for a user that does not exist", async () => {
    const res = await request(app).patch("/api/admin/users/99999").set(auth(adminToken)).send({ dept: "X" });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it("returns 400 when no editable fields are sent", async () => {
    const res = await request(app).patch("/api/admin/users/2").set(auth(adminToken)).send({ notAField: 1 });
    expect(res.status).toBe(400);
  });

  it("refuses to let an admin demote their own account (400)", async () => {
    const res = await request(app).patch(`/api/admin/users/${adminUser.id}`).set(auth(adminToken)).send({ role: "user" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/own role/i);
  });

  it("rejects an invalid role value with 400", async () => {
    const res = await request(app).patch("/api/admin/users/3").set(auth(adminToken)).send({ role: "banana" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/role/i);
  });

  it("rejects a badly formatted phone with 400", async () => {
    const res = await request(app).patch("/api/admin/users/3").set(auth(adminToken)).send({ phone: "abc" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/phone/i);
  });

  it("rejects a username that another account already has with 409 (not a 500 crash)", async () => {
    const res = await request(app).patch("/api/admin/users/3").set(auth(adminToken)).send({ username: "jessica" });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/taken/i);
  });

  it("rejects a badly formatted username with 400", async () => {
    const res = await request(app).patch("/api/admin/users/3").set(auth(adminToken)).send({ username: "Bad Name!" });
    expect(res.status).toBe(400);
  });

  it("stores usernames lowercase so the user can still log in afterwards", async () => {
    const res = await request(app).patch("/api/admin/users/5").set(auth(adminToken)).send({ username: "LaPulgaRenamed" });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe("lapulgarenamed");
    const l = await request(app).post("/api/auth/login").send({ username: "lapulgarenamed", password: "1234" });
    expect(l.status).toBe(200);
  });

  it.each([
    ["rating", "abc"], ["rating", 9], ["rating", -1],
    ["reviews", -3], ["reviews", 1.5], ["swaps", "many"],
    ["name", ""], ["dept", 42],
  ])("rejects %s = %p with 400", async (field, value) => {
    const res = await request(app).patch("/api/admin/users/6").set(auth(adminToken)).send({ [field]: value });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(new RegExp(field, "i"));
  });

  it("accepts boundary values (rating 0 and 5)", async () => {
    const lo = await request(app).patch("/api/admin/users/6").set(auth(adminToken)).send({ rating: 0 });
    const hi = await request(app).patch("/api/admin/users/6").set(auth(adminToken)).send({ rating: 5 });
    expect(lo.status).toBe(200);
    expect(hi.status).toBe(200);
    expect(hi.body.rating).toBe(5);
  });

  it("a rejected PATCH changes nothing (no partial writes)", async () => {
    const before = (await request(app).get("/api/admin/users").set(auth(adminToken))).body.find((u) => u.id === 7);
    const bad = await request(app).patch("/api/admin/users/7").set(auth(adminToken)).send({ dept: "ShouldNotStick", rating: "abc" });
    expect(bad.status).toBe(400);
    const after = (await request(app).get("/api/admin/users").set(auth(adminToken))).body.find((u) => u.id === 7);
    expect(after).toEqual(before);
  });
});

describe("PATCH /api/admin/users/:id/password", () => {
  it("resets a password directly (204) and flags the account to change it again", async () => {
    const res = await request(app).patch("/api/admin/users/4/password").set(auth(adminToken)).send({ newPassword: "resetme1" });
    expect(res.status).toBe(204);
    const login2 = await request(app).post("/api/auth/login").send({ username: "kdot", password: "resetme1" });
    expect(login2.status).toBe(200);
    expect(login2.body.user.mustChangePassword).toBe(true);
  });

  it("rejects a missing/too-short password with 400", async () => {
    const res = await request(app).patch("/api/admin/users/4/password").set(auth(adminToken)).send({ newPassword: "ab" });
    expect(res.status).toBe(400);
  });

  it("returns 404 for a user that does not exist", async () => {
    const res = await request(app).patch("/api/admin/users/99999/password").set(auth(adminToken)).send({ newPassword: "abcd1234" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/admin/users/:id", () => {
  it("deletes an account (204), and it is really gone (re-fetch + second delete both prove it)", async () => {
    const res = await request(app).delete("/api/admin/users/14").set(auth(adminToken));
    expect(res.status).toBe(204);
    const list = await request(app).get("/api/admin/users").set(auth(adminToken));
    expect(list.body.some((u) => u.id === 14)).toBe(false);
    const again = await request(app).delete("/api/admin/users/14").set(auth(adminToken));
    expect(again.status).toBe(404);
  });

  it("returns 404 for a user that never existed", async () => {
    const res = await request(app).delete("/api/admin/users/99999").set(auth(adminToken));
    expect(res.status).toBe(404);
  });

  it("refuses to let an admin delete their own account (400)", async () => {
    const res = await request(app).delete(`/api/admin/users/${adminUser.id}`).set(auth(adminToken));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/admin/audit-log", () => {
  it("records every admin write with who/what/target, newest first", async () => {
    const res = await request(app).get("/api/admin/audit-log").set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const actions = res.body.map((e) => e.action);
    expect(actions).toEqual(expect.arrayContaining(["register_user", "edit_user", "reset_password", "delete_user"]));
    const entry = res.body[0];
    expect(entry).toEqual(expect.objectContaining({ adminUsername: "admin" }));
    expect(typeof entry.action).toBe("string");
    expect(typeof entry.createdAt).toBe("string");
    const del = res.body.find((e) => e.action === "delete_user");
    expect(del.targetUsername).toBeTruthy(); // survives the account being deleted
    for (let i = 1; i < res.body.length; i++) expect(res.body[i - 1].id).toBeGreaterThan(res.body[i].id);
  });
});
