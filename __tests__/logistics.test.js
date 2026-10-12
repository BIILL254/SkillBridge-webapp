import { request, app, login, auth } from "./helpers.js";

let token;
beforeAll(async () => { ({ token } = await login("billamani")); });

describe("logistics proxy requires login", () => {
  it.each([
    ["get", "/api/logistics/stations"], ["get", "/api/logistics/estates"], ["get", "/api/logistics/deliveries/1"],
    ["post", "/api/logistics/deliveries"], ["post", "/api/logistics/estates/est_1/driver-interests"],
  ])("%s %s -> 401 with no token", async (m, url) => {
    expect((await request(app)[m](url).send({})).status).toBe(401);
  });
});

describe("GET /api/logistics/stations (mock mode in tests)", () => {
  it("returns stations in Maji's real shape, labelled as mock data", async () => {
    const res = await request(app).get("/api/logistics/stations").set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.source).toBe("mock");
    expect(res.body.stations.length).toBeGreaterThan(0);
    expect(res.body.stations[0]).toEqual({ vendorId: expect.any(String), stationName: expect.any(String), targetEstateId: expect.any(String) });
  });

  it("filters to one estate", async () => {
    const res = await request(app).get("/api/logistics/stations?estate=Kileleshwa").set(auth(token));
    expect(res.body.stations.length).toBe(1);
    expect(res.body.stations[0].stationName).toMatch(/Kileleshwa/);
  });

  it("edge case: an estate with no stations gives an empty list, not an error", async () => {
    const res = await request(app).get("/api/logistics/stations?estate=Atlantis").set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.stations).toEqual([]);
  });
});

describe("GET /api/logistics/estates", () => {
  it("returns estates with id, name, deliveryStatus", async () => {
    const res = await request(app).get("/api/logistics/estates").set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.estates[0]).toEqual({ id: expect.any(String), name: expect.any(String), deliveryStatus: expect.stringMatching(/^(active|inactive)$/) });
  });

  it.each(["active", "inactive"])("?deliveryStatus=%s returns only those", async (status) => {
    const res = await request(app).get(`/api/logistics/estates?deliveryStatus=${status}`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.estates.length).toBeGreaterThan(0);
    res.body.estates.forEach((e) => expect(e.deliveryStatus).toBe(status));
  });

  it("rejects an unknown deliveryStatus with 400 (not a silent empty list)", async () => {
    const res = await request(app).get("/api/logistics/estates?deliveryStatus=banana").set(auth(token));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/deliveryStatus/);
  });
});

describe("delivery endpoints — deliberately unsupported (Maji has no delivery API)", () => {
  it("GET /deliveries/:id answers 501 with an explanation, not a fake success", async () => {
    const res = await request(app).get("/api/logistics/deliveries/101").set(auth(token));
    expect(res.status).toBe(501);
    expect(res.body.error).toMatch(/delivery/i);
  });

  it("POST /deliveries answers 501 too", async () => {
    const res = await request(app).post("/api/logistics/deliveries").set(auth(token)).send({ stationId: 1 });
    expect(res.status).toBe(501);
    expect(typeof res.body.error).toBe("string");
  });
});

describe("POST /api/logistics/estates/:estateId/driver-interests", () => {
  it("registers interest (201) and echoes the estate and user, as pending", async () => {
    const res = await request(app).post("/api/logistics/estates/est_1029/driver-interests").set(auth(token))
      .send({ userId: "usr_5581", contactMethod: "+254712345678" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ source: "mock", userId: "usr_5581", estateId: "est_1029", status: "pending" });
    expect(typeof res.body.id).toBe("string");
    expect(Number.isNaN(Date.parse(res.body.createdAt))).toBe(false);
  });

  it("contactMethod is optional", async () => {
    const res = await request(app).post("/api/logistics/estates/est_1029/driver-interests").set(auth(token)).send({ userId: "usr_1" });
    expect(res.status).toBe(201);
  });

  it.each([
    ["userId missing", {}],
    ["userId empty", { userId: "" }],
    ["userId a number", { userId: 5581 }],
    ["contactMethod a number", { userId: "usr_1", contactMethod: 712345678 }],
  ])("rejects %s with 400", async (_l, body) => {
    const res = await request(app).post("/api/logistics/estates/est_1029/driver-interests").set(auth(token)).send(body);
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe("string");
  });
});
