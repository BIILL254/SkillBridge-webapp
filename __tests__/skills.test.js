import { request, app } from "./helpers.js";

const isSkillShape = (s) => {
  expect(Number.isInteger(s.id)).toBe(true);
  expect(typeof s.name).toBe("string");
  expect(typeof s.category).toBe("string");
};

describe("GET /api/skills", () => {
  it("returns every skill as { id, name, category } (the contract's Skill schema)", async () => {
    const res = await request(app).get("/api/skills");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(30);
    res.body.forEach(isSkillShape);
  });

  it("skill ids are unique", async () => {
    const res = await request(app).get("/api/skills");
    const ids = res.body.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("?tag=<category> returns only that category", async () => {
    const res = await request(app).get("/api/skills?tag=Agriculture");
    expect(res.status).toBe(200);
    expect(res.body.map((s) => s.name).sort()).toEqual([
      "Agronomy", "Crop Disease Management", "Farm Tech", "Irrigation Systems",
      "Livestock Management", "Organic Farming", "Soil Health",
    ]);
    res.body.forEach((s) => expect(s.category).toBe("Agriculture"));
  });

  it("?tag=<skill name> works too — the contract's own example is tag=Agronomy", async () => {
    const res = await request(app).get("/api/skills?tag=Agronomy");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0]).toMatchObject({ name: "Agronomy", category: "Agriculture" });
  });

  it("tag matching is case-insensitive", async () => {
    const a = await request(app).get("/api/skills?tag=agronomy");
    const b = await request(app).get("/api/skills?tag=AGRICULTURE");
    expect(a.body.length).toBe(1);
    expect(b.body.length).toBe(7);
  });

  it("edge case: a tag nothing matches returns an empty array (200), not an error", async () => {
    const res = await request(app).get("/api/skills?tag=Underwater%20Basket%20Weaving");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("an empty tag behaves like no tag (returns everything)", async () => {
    const all = await request(app).get("/api/skills");
    const empty = await request(app).get("/api/skills?tag=");
    expect(empty.body.length).toBe(all.body.length);
  });
});
