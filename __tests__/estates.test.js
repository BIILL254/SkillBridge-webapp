// Maji's estates list moved to v2 (deprecation notice, 12 Nov 2026; v1 stops 13 Nov).
// Our client tries v2 first, then v1, then the Week 4 contract.

import { request, app, login, auth } from "./helpers.js";
import { clearLastGoodCache } from "../server/services/majiClient.js";

let token;
beforeAll(async () => {
  ({ token } = await login("billamani"));
});

const V2 = "/api/v2/orders/active/estates";
const V1 = "/api/orders/active/estates";

// fake Maji: routes maps a path to { status, body }; anything else is 404
function fakeMaji(routes, calls) {
  global.fetch = async (url) => {
    const path = new URL(url).pathname;
    calls.push(path);
    const hit = routes[path];
    if (!hit) return { ok: false, status: 404, json: async () => ({ error: "Not found" }) };
    return { ok: hit.status < 400, status: hit.status, json: async () => hit.body };
  };
}

describe("GET /api/logistics/estates against Maji v1 and v2", () => {
  const realFetch = global.fetch;
  beforeEach(() => {
    process.env.MAJI_API_BASE_URL = "https://maji.example.test";
    clearLastGoodCache();
  });
  afterEach(() => {
    global.fetch = realFetch;
    process.env.MAJI_API_BASE_URL = "";
    clearLastGoodCache();
  });

  const get = () => request(app).get("/api/logistics/estates").set(auth(token));

  test("reads Maji's v2 wrapped list ({ data, count }) and never calls v1", async () => {
    const calls = [];
    fakeMaji({ [V2]: { status: 200, body: { data: [{ estate: "Kasarani" }, { estate: "Roysambu" }], count: 2 } } }, calls);
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.body.source).toBe("live");
    expect(res.body.estates.map((e) => e.name)).toEqual(["Kasarani", "Roysambu"]);
    expect(calls).toEqual([V2]);
  });

  test("falls back to v1 (bare array) while v1 still exists", async () => {
    const calls = [];
    fakeMaji({ [V1]: { status: 200, body: [{ estate: "Kasarani" }] } }, calls);
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.body.source).toBe("live");
    expect(res.body.estates.map((e) => e.name)).toEqual(["Kasarani"]);
    expect(calls).toEqual([V2, V1]);
  });

  test("a 410 from retired v1 does not matter when v2 answers", async () => {
    const calls = [];
    fakeMaji(
      { [V2]: { status: 200, body: { data: [{ estate: "Roysambu" }], count: 1 } }, [V1]: { status: 410, body: { error: "Gone" } } },
      calls,
    );
    const res = await get();
    expect(res.body.estates.map((e) => e.name)).toEqual(["Roysambu"]);
    expect(calls).toEqual([V2]);
  });

  test("steps down to the Week 4 contract when neither version exists", async () => {
    const calls = [];
    fakeMaji({ "/estates": { status: 200, body: [{ id: "e1", name: "Westlands", deliveryStatus: "active" }] } }, calls);
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.body.estates[0].name).toBe("Westlands");
    expect(calls).toEqual([V2, V1, "/estates"]);
  });

  test("an empty v2 list is an empty list, not an error", async () => {
    fakeMaji({ [V2]: { status: 200, body: { data: [], count: 0 } } }, []);
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.body.estates).toEqual([]);
  });
});
