import supertest from "supertest";
import app from "../server/app.js";

// The test keys set in setup.js.
export const KEYS = { web: "test-key-web", agroconnect: "test-key-agroconnect", team: "test-key-team" };

// supertest, but every call automatically carries a valid X-API-Key (the API
// rejects everything else with 401). Tests that need NO key or a WRONG key
// import supertest directly instead - see apikey.test.js.
const METHODS = ["get", "post", "put", "patch", "delete", "options", "head"];
function request(target) {
  const agent = supertest(target);
  return Object.fromEntries(METHODS.map((m) => [m, (...args) => agent[m](...args).set("X-API-Key", KEYS.web)]));
}

// Logs in as a seeded demo account (all start on password "1234") and
// returns the bearer token plus the user object.
export async function login(username, password = "1234") {
  const res = await request(app).post("/api/auth/login").send({ username, password });
  if (res.status !== 200) throw new Error(`test login failed for ${username}: ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.token, user: res.body.user };
}

export const auth = (token) => ({ Authorization: `Bearer ${token}` });
export { app, request };
