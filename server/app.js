// server/app.js
//
// Builds the Express app (routes, middleware, error handling) and exports it
// WITHOUT starting a listener. server.js imports this and calls listen();
// the automated tests (__tests__/) import this directly so supertest can
// call the real routes without needing a port.

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsPath = path.join(__dirname, "..", "docs");

import usersRouter from "./routes/users.routes.js";
import requestsRouter from "./routes/requests.routes.js";
import sessionsRouter from "./routes/sessions.routes.js";
import profileRouter from "./routes/profile.routes.js";
import expertsRouter from "./routes/experts.routes.js";
import skillsRouter from "./routes/skills.routes.js";
import logisticsRouter from "./routes/logistics.routes.js";
import authRouter from "./routes/auth.routes.js";
import adminRouter from "./routes/admin.routes.js";
import { createRequireApiKey, createRateLimit } from "./middleware/apiKey.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

// Don't advertise "X-Powered-By: Express" on every response.
app.disable("x-powered-by");

// Behind a host's reverse proxy (Render), req.ip would be the proxy's address
// unless Express is told to trust the forwarded one. Set TRUST_PROXY=1 there.
// Leave it unset locally so a client cannot fake its address.
if (process.env.TRUST_PROXY) {
  app.set("trust proxy", /^\d+$/.test(process.env.TRUST_PROXY) ? Number(process.env.TRUST_PROXY) : process.env.TRUST_PROXY);
}

const intFromEnv = (name, fallback) => {
  const n = Number.parseInt(process.env[name], 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

// CORS: permissive by default (fine for local dev — the Vite dev server
// runs on a different port). Once deployed, set ALLOWED_ORIGIN in the
// environment to your actual frontend URL to stop other websites' JS
// from being able to call this API directly from a browser.
const allowedOrigin = process.env.ALLOWED_ORIGIN;
app.use(cors(allowedOrigin ? { origin: allowedOrigin } : {})); // also answers browser preflights (OPTIONS), which carry no API key

// ---- Public: the ONLY things reachable without an API key -----------------
// /api/health: a host's uptime check cannot send a key, and it returns no data.
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// The published documentation (Week 8): static pages and the contract file.
// They explain how to use the API and contain no user data; a stranger
// needs them BEFORE they have a key.
app.use("/docs", express.static(docsPath));
app.use("/api-docs", express.static(docsPath));
app.get("/openapi.yaml", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "openapi.yaml"));
});
// Interactive Swagger UI for consumers (AgroConnect) to try the API. It is the
// same static docs page as /docs/swagger.html: no data, and you still need a
// key to actually send a request from it.
app.get(["/swagger", "/test"], (req, res) => {
  res.sendFile(path.join(docsPath, "swagger.html"));
});

// ---- Everything below requires a valid X-API-Key ---------------------------
// Registered BEFORE the routes (and before the body parser), so a request with
// no key or a wrong key gets 401 and no route handler ever runs.
app.use(createRequireApiKey());
// Per-key rate limit (429 + Retry-After). Defaults: 100 requests/minute for
// each partner/team key, 300/minute per IP address for our own web app.
app.use(createRateLimit({
  windowMs: intFromEnv("RATE_LIMIT_WINDOW_MS", 60_000),
  max: intFromEnv("RATE_LIMIT_MAX", 100),
  webMax: intFromEnv("RATE_LIMIT_WEB_MAX", 300),
}));

app.use(express.json());  // parse JSON request bodies into req.body

app.use("/api/users", usersRouter);
app.use("/api/requests", requestsRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/profile", profileRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);

// Downstream — served TO Farmers-AgroConnect
app.use("/api/experts", expertsRouter);
app.use("/api/skills", skillsRouter);

// Upstream — proxying calls TO Maji Website (see server/services/majiClient.js)
app.use("/api/logistics", logisticsRouter);

// Root aliases for AgroConnect, so both /api/experts and /experts work as
// documented in ENDPOINT_LIST.md. They are registered AFTER the key check and
// rate limit above, so they need an X-API-Key exactly like the /api versions.
app.use("/experts", expertsRouter);
app.use("/skills", skillsRouter);
app.use("/requests", requestsRouter);

// catch-all for unmatched API routes
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

// global error handler: see middleware/errorHandler.js (never leaks raw
// internal error messages to the client)
app.use(errorHandler);

export default app;
