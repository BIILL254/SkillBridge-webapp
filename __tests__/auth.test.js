import { request, app, login, auth } from "./helpers.js";

describe("POST /api/auth/login", () => {
  it("logs in a seeded user and returns a token plus a safe user object", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "billamani", password: "1234" });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token.length).toBeGreaterThan(20);
    expect(res.body.user).toMatchObject({ username: "billamani", name: "Bill Amani", role: "user" });
    expect(typeof res.body.user.id).toBe("number");
    expect(res.body.user.mustChangePassword).toBe(true); // seeded accounts start on a default password
    expect(res.body.user).not.toHaveProperty("password_hash");
  });

  it("is case-insensitive on username", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "BillAmani", password: "1234" });
    expect(res.status).toBe(200);
  });

  it("rejects missing fields with 400", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "billamani" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it("rejects a wrong password with 401", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "billamani", password: "nope" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid username or password");
  });

  it("gives the SAME 401 message for an unknown username (no user enumeration)", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "ghostuser", password: "1234" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid username or password");
  });
});

describe("POST /api/auth/signup", () => {
  const valid = { name: "Vini Jr", username: "vinijr", phone: "0712345678", password: "secret1" };

  it("creates an account, auto-generates initials, and returns 201 with a token", async () => {
    const res = await request(app).post("/api/auth/signup").send(valid);
    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user).toMatchObject({ name: "Vini Jr", username: "vinijr", initials: "V.J", role: "user", phone: "0712345678" });
    expect(res.body.user.mustChangePassword).toBe(false); // they chose their own password
    expect(res.body.user).not.toHaveProperty("password_hash");
  });

  it("the new account can actually log in afterwards (write really happened)", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "vinijr", password: "secret1" });
    expect(res.status).toBe(200);
  });

  it.each([
    ["name", { ...valid, username: "a1", name: undefined }],
    ["username", { ...valid, username: undefined }],
    ["phone", { ...valid, username: "a2", phone: undefined }],
    ["password", { ...valid, username: "a3", password: undefined }],
  ])("rejects a missing %s with 400", async (_field, body) => {
    const res = await request(app).post("/api/auth/signup").send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it("rejects a too-short password with 400", async () => {
    const res = await request(app).post("/api/auth/signup").send({ ...valid, username: "shortpw", password: "abc" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 4/i);
  });

  it.each(["12345", "0812345678", "07123456", "071234567890", "abcdefghij"])("rejects bad phone %s with 400", async (phone) => {
    const res = await request(app).post("/api/auth/signup").send({ ...valid, username: "phonetest", phone });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/phone/i);
  });

  it("accepts the 01XXXXXXXX phone format too (boundary)", async () => {
    const res = await request(app).post("/api/auth/signup").send({ ...valid, username: "newprefix", phone: "0112345678" });
    expect(res.status).toBe(201);
  });

  it("rejects a bad username with 400", async () => {
    const res = await request(app).post("/api/auth/signup").send({ ...valid, username: "no spaces!" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/username/i);
  });

  it("rejects a duplicate username with 409", async () => {
    const res = await request(app).post("/api/auth/signup").send(valid);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/taken/i);
  });
});

describe("GET /api/auth/me", () => {
  it("returns the logged-in user", async () => {
    const { token } = await login("jessica");
    const res = await request(app).get("/api/auth/me").set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ username: "jessica", name: "Jessica" });
  });

  it("returns 401 with no token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(typeof res.body.error).toBe("string");
  });

  it("returns 401 for a garbage token", async () => {
    const res = await request(app).get("/api/auth/me").set(auth("not-a-real-token"));
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/auth/password", () => {
  it("changes the password (204), clears mustChangePassword, and the old password stops working", async () => {
    const { token } = await login("kdot");
    const res = await request(app).patch("/api/auth/password").set(auth(token)).send({ oldPassword: "1234", newPassword: "fresh99" });
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});

    const oldLogin = await request(app).post("/api/auth/login").send({ username: "kdot", password: "1234" });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(app).post("/api/auth/login").send({ username: "kdot", password: "fresh99" });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.user.mustChangePassword).toBe(false);
  });

  it("rejects missing fields with 400", async () => {
    const { token } = await login("lapulga");
    const res = await request(app).patch("/api/auth/password").set(auth(token)).send({ oldPassword: "1234" });
    expect(res.status).toBe(400);
  });

  it("rejects a too-short new password with 400", async () => {
    const { token } = await login("lapulga");
    const res = await request(app).patch("/api/auth/password").set(auth(token)).send({ oldPassword: "1234", newPassword: "abc" });
    expect(res.status).toBe(400);
  });

  it("rejects a wrong old password with 401 and changes nothing", async () => {
    const { token } = await login("lapulga");
    const res = await request(app).patch("/api/auth/password").set(auth(token)).send({ oldPassword: "wrong", newPassword: "whatever1" });
    expect(res.status).toBe(401);
    const still = await request(app).post("/api/auth/login").send({ username: "lapulga", password: "1234" });
    expect(still.status).toBe(200);
  });

  it("requires login (401)", async () => {
    const res = await request(app).patch("/api/auth/password").send({ oldPassword: "1234", newPassword: "abcd" });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("invalidates the token (204, then the same token gets 401)", async () => {
    const { token } = await login("walterwhite");
    const out = await request(app).post("/api/auth/logout").set(auth(token));
    expect(out.status).toBe(204);
    const after = await request(app).get("/api/auth/me").set(auth(token));
    expect(after.status).toBe(401);
  });

  it("requires login (401)", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(401);
  });
});
