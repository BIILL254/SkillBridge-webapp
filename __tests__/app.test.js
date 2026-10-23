import { request, app } from "./helpers.js";

describe("GET /api/health", () => {
  it("reports the server is up", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("unknown routes and malformed input", () => {
  it("returns 404 with an error message for an unknown /api path", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(typeof res.body.error).toBe("string");
  });

  it("returns 400 (not a crash / 500) for malformed JSON", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{ this is not json");
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe("string");
  });

  it("serves Swagger UI at /swagger for consumer testing", async () => {
    const res = await request(app).get("/swagger");
    expect(res.status).toBe(200);
    expect(res.text).toContain("SwaggerUIBundle");
  });

  it("supports root downstream alias /experts directly", async () => {
    const res = await request(app).get("/experts");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
