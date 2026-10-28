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
  it("returns vendors in Maji's current shape (vendorId, businessName, estate), labelled as mock data", async () => {
    const res = await request(app).get("/api/logistics/stations").set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.source).toBe("mock");
    expect(res.body.stations.length).toBeGreaterThan(0);
    expect(res.body.stations[0]).toEqual({ vendorId: expect.any(Number), businessName: expect.any(String), estate: expect.any(String) });
  });

  it("filters to one estate", async () => {
    const res = await request(app).get("/api/logistics/stations?estate=Kileleshwa").set(auth(token));
    expect(res.body.stations.length).toBe(1);
    expect(res.body.stations[0]).toMatchObject({ businessName: "Kileleshwa Fresh Water", estate: "Kileleshwa" });
  });

  it("accepts our own 'Estate, Nairobi' spelling and ignores capitals", async () => {
    const res = await request(app).get("/api/logistics/stations?estate=" + encodeURIComponent("KILELESHWA, Nairobi")).set(auth(token));
    expect(res.body.stations.map((s) => s.estate)).toEqual(["Kileleshwa"]);
  });

  it("edge case: an estate with no vendors gives an empty list, not an error", async () => {
    const res = await request(app).get("/api/logistics/stations?estate=Atlantis").set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.stations).toEqual([]);
  });

  it.each([["empty", ""], ["blank", "%20%20"]])("rejects a %s estate with 400 (Maji does the same)", async (_l, value) => {
    const res = await request(app).get(`/api/logistics/stations?estate=${value}`).set(auth(token));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/estate/);
  });
});

describe("GET /api/logistics/vendors/top-rated (mock mode in tests)", () => {
  it("requires login", async () => {
    expect((await request(app).get("/api/logistics/vendors/top-rated")).status).toBe(401);
  });

  it("returns top-rated vendors and never includes owner name or phone", async () => {
    const res = await request(app).get("/api/logistics/vendors/top-rated").set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.source).toBe("mock");
    expect(res.body.vendors.length).toBeGreaterThan(0);
    for (const v of res.body.vendors) {
      expect(Object.keys(v).sort()).toEqual(["businessName", "estate", "isOnline", "isVerified", "rating", "vendorId"]);
      expect(v.rating).toBeGreaterThanOrEqual(3);
      expect(v.rating).toBeLessThanOrEqual(5);
    }
  });
});

describe("GET /api/logistics/vendors/all (mock mode in tests)", () => {
  it("requires login", async () => {
    expect((await request(app).get("/api/logistics/vendors/all")).status).toBe(401);
  });

  it("returns every vendor with rating and contact details, labelled as mock data", async () => {
    const res = await request(app).get("/api/logistics/vendors/all").set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.source).toBe("mock");
    expect(res.body.vendors.length).toBeGreaterThan(1);
    for (const v of res.body.vendors) {
      expect(Object.keys(v).sort()).toEqual(["businessName", "estate", "isOnline", "isVerified", "ownerName", "phone", "rating", "vendorId"]);
    }
  });

  it("filters by estate, accepting 'Estate, Nairobi' and ignoring capitals", async () => {
    const res = await request(app).get("/api/logistics/vendors/all?estate=" + encodeURIComponent("WESTLANDS, Nairobi")).set(auth(token));
    expect(res.body.vendors.map((v) => v.estate)).toEqual(["Westlands"]);
  });

  it("an estate with no vendors gives [] (not an error)", async () => {
    const res = await request(app).get("/api/logistics/vendors/all?estate=Atlantis").set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.vendors).toEqual([]);
  });

  it("rejects a blank estate with 400", async () => {
    const res = await request(app).get("/api/logistics/vendors/all?estate=").set(auth(token));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/estate/);
  });
});

// LIVE mode, with Maji's server faked: checks the exact URL we call on Maji
// (their CURRENT paths) and how we map their answer. Nothing touches the network.
describe("live mode against a faked Maji Website", () => {
  const realFetch = global.fetch;
  let calls;
  const fakeMaji = (handler) => {
    calls = [];
    global.fetch = async (url, opts) => {
      calls.push(String(url));
      const { status = 200, body } = handler(String(url), opts);
      return { ok: status >= 200 && status < 300, status, json: async () => body };
    };
  };
  beforeEach(() => { process.env.MAJI_API_BASE_URL = "https://maji.example.test/"; });
  afterEach(() => { global.fetch = realFetch; process.env.MAJI_API_BASE_URL = ""; });

  it("stations: calls /api/vendors/locations?estate=<Maji spelling> and maps the fields", async () => {
    fakeMaji(() => ({ body: [{ vendorId: 9, businessName: "Chemchemi Fresh Water Co.", estate: "Kasarani", secret: "do not pass on" }] }));
    const res = await request(app).get("/api/logistics/stations?estate=" + encodeURIComponent("Kasarani, Nairobi")).set(auth(token));
    expect(res.status).toBe(200);
    expect(calls).toEqual(["https://maji.example.test/api/vendors/locations?estate=Kasarani"]);
    expect(res.body).toEqual({ source: "live", stations: [{ vendorId: 9, businessName: "Chemchemi Fresh Water Co.", estate: "Kasarani" }] });
  });

  it("stations without an estate calls the plain path (all vendors)", async () => {
    fakeMaji(() => ({ body: [] }));
    await request(app).get("/api/logistics/stations").set(auth(token));
    expect(calls).toEqual(["https://maji.example.test/api/vendors/locations"]);
  });

  it("top-rated: calls /api/vendors/top-rated and strips ownerName and phone", async () => {
    fakeMaji(() => ({ body: [{ vendorId: 17, businessName: "AquaFresh Nairobi", estate: "Dagoretti", rating: 4.4, isVerified: true, isOnline: false, ownerName: "Daniel Mutua", phone: "0718045704" }] }));
    const res = await request(app).get("/api/logistics/vendors/top-rated").set(auth(token));
    expect(calls).toEqual(["https://maji.example.test/api/vendors/top-rated"]);
    expect(res.body.source).toBe("live");
    expect(res.body.vendors[0]).toEqual({ vendorId: 17, businessName: "AquaFresh Nairobi", estate: "Dagoretti", rating: 4.4, isVerified: true, isOnline: false });
    expect(JSON.stringify(res.body)).not.toMatch(/0718045704|Daniel/);
  });

  it("vendors/all: calls /api/vendors/all?estate=<Maji spelling> and maps only the known fields", async () => {
    fakeMaji(() => ({ body: [{ vendorId: 3, businessName: "Chemchemi", estate: "Kasarani", rating: 4.1, isVerified: true, isOnline: false, ownerName: "A. Owner", phone: "0711111111", internalNote: "never pass on" }] }));
    const res = await request(app).get("/api/logistics/vendors/all?estate=" + encodeURIComponent("Kasarani, Nairobi")).set(auth(token));
    expect(calls).toEqual(["https://maji.example.test/api/vendors/all?estate=Kasarani"]);
    expect(res.body).toEqual({ source: "live", vendors: [{ vendorId: 3, businessName: "Chemchemi", estate: "Kasarani", rating: 4.1, isVerified: true, isOnline: false, ownerName: "A. Owner", phone: "0711111111" }] });
  });

  it("vendors/all without an estate calls the plain path", async () => {
    fakeMaji(() => ({ body: [] }));
    await request(app).get("/api/logistics/vendors/all").set(auth(token));
    expect(calls).toEqual(["https://maji.example.test/api/vendors/all"]);
  });

  it("vendors/all: an upstream 400 from Maji is passed on as 400, a non-array answer is a 502", async () => {
    fakeMaji(() => ({ status: 400, body: { error: "estate must be a non-empty string" } }));
    expect((await request(app).get("/api/logistics/vendors/all").set(auth(token))).status).toBe(400);
    fakeMaji(() => ({ body: { nope: true } }));
    expect((await request(app).get("/api/logistics/vendors/all").set(auth(token))).status).toBe(502);
  });

  it("an upstream 404 (endpoint not deployed on Maji yet) becomes a 502, not a confusing 404 from us", async () => {
    fakeMaji(() => ({ status: 404, body: undefined }));
    // Maji's real 404 body is an HTML page, so .json() fails; mimic that
    global.fetch = async () => ({ ok: false, status: 404, json: async () => { throw new Error("not json"); } });
    const res = await request(app).get("/api/logistics/vendors/all").set(auth(token));
    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/404/);
  });

  it("an upstream 500 becomes a 502 from us, with Maji's message and no stack", async () => {
    fakeMaji(() => ({ status: 500, body: { error: "Failed to fetch vendor locations" } }));
    const res = await request(app).get("/api/logistics/stations").set(auth(token));
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: "Failed to fetch vendor locations" });
  });

  it("a non-array answer from Maji is a 502, not a crash", async () => {
    fakeMaji(() => ({ body: { oops: true } }));
    const res = await request(app).get("/api/logistics/vendors/top-rated").set(auth(token));
    expect(res.status).toBe(502);
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
