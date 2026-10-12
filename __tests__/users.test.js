import { request, app } from "./helpers.js";

describe("GET /api/users", () => {
  it("lists the students in the documented shape", async () => {
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(14);
    expect(res.body[0]).toEqual({
      id: expect.any(Number), name: expect.any(String), dept: expect.any(String), initials: expect.any(String),
      online: expect.any(Boolean), rating: expect.any(Number), reviews: expect.any(Number), swaps: expect.any(Number),
      estate: expect.anything(), lat: expect.anything(), lng: expect.anything(),
      offers: expect.any(Array), wants: expect.any(Array),
    });
  });

  it("never exposes credentials or contact details", async () => {
    const res = await request(app).get("/api/users");
    const text = JSON.stringify(res.body);
    expect(text).not.toMatch(/password/i);
    res.body.forEach((u) => { expect(u).not.toHaveProperty("phone"); expect(u).not.toHaveProperty("username"); });
  });

  it("does not list the admin account as a student", async () => {
    const res = await request(app).get("/api/users");
    expect(res.body.some((u) => u.name === "Admin")).toBe(false);
  });
});

describe("GET /api/users/:id", () => {
  it("returns one user with their skills", async () => {
    const res = await request(app).get("/api/users/1");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 1, name: "Bill Amani" });
    expect(res.body.offers).toContain("Python");
  });

  it("returns 404 for a user that does not exist", async () => {
    const res = await request(app).get("/api/users/99999");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it("returns 404 for a non-numeric id", async () => {
    expect((await request(app).get("/api/users/abc")).status).toBe(404);
  });

  it("returns 404 for the admin's id (not a student)", async () => {
    expect((await request(app).get("/api/users/15")).status).toBe(404);
  });
});
