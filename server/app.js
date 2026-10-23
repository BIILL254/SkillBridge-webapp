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

const app = express();

// CORS: permissive by default (fine for local dev — the Vite dev server
// runs on a different port). Once deployed, set ALLOWED_ORIGIN in the
// environment to your actual frontend URL to stop other websites' JS
// from being able to call this API directly from a browser.
const allowedOrigin = process.env.ALLOWED_ORIGIN;
app.use(cors(allowedOrigin ? { origin: allowedOrigin } : {}));
app.use(express.json());  // parse JSON request bodies into req.body

// simple endpoint to check the server is actually up
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/users", usersRouter);
app.use("/api/requests", requestsRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/profile", profileRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);

// Downstream — served TO Farmers-AgroConnect
app.use("/api/experts", expertsRouter);
app.use("/api/skills", skillsRouter);

// Root route aliases for AgroConnect: allows calling both /api/experts and /experts
// directly as documented in ENDPOINT_LIST.md
app.use("/experts", expertsRouter);
app.use("/skills", skillsRouter);
app.use("/requests", requestsRouter);

// Upstream — proxying calls TO Maji Website (see server/services/majiClient.js)
app.use("/api/logistics", logisticsRouter);

// Direct interactive testing UI for AgroConnect and consumers
app.get(["/swagger", "/test"], (req, res) => {
  res.sendFile(path.join(docsPath, "swagger.html"));
});

// Documentation site and OpenAPI spec
app.use("/docs", express.static(docsPath));
app.use("/api-docs", express.static(docsPath));
app.get("/openapi.yaml", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "openapi.yaml"));
});

// catch-all for unmatched API routes
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

// global error handler — keeps a thrown error (bad JSON body, a DB
// constraint failure, an insufficient-coins guard, etc.) from crashing the
// process or leaking a raw stack trace to the client. Must be defined last,
// and needs all four args for Express to treat it as an error handler.
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== "test") console.error(err); // tests trigger errors on purpose; keep their output readable
  res.status(err.status || 500).json({ error: err.message || "Something went wrong" });
});

export default app;
