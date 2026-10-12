import request from "supertest";
import app from "../server/app.js";

// Logs in as a seeded demo account (all start on password "1234") and
// returns the bearer token plus the user object.
export async function login(username, password = "1234") {
  const res = await request(app).post("/api/auth/login").send({ username, password });
  if (res.status !== 200) throw new Error(`test login failed for ${username}: ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.token, user: res.body.user };
}

export const auth = (token) => ({ Authorization: `Bearer ${token}` });
export { app, request };
