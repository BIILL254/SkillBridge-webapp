// server/server.js
//
// The SkillBridge API. Run it with `npm run server` (or `npm run server:dev`
// for auto-restart on save). It listens on port 3001 by default and the
// React app (running separately on port 5173 via `npm run dev`) talks to
// it over HTTP — see src/api.js on the frontend side.

import express from "express";
import cors from "cors";
import "dotenv/config";

import usersRouter from "./routes/users.routes.js";
import requestsRouter from "./routes/requests.routes.js";
import sessionsRouter from "./routes/sessions.routes.js";
import profileRouter from "./routes/profile.routes.js";
import expertsRouter from "./routes/experts.routes.js";
import skillsRouter from "./routes/skills.routes.js";
import logisticsRouter from "./routes/logistics.routes.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());          // allow the Vite dev server (different port) to call this API
app.use(express.json());  // parse JSON request bodies into req.body

// simple endpoint to check the server is actually up
app.get("/", (req, res) => {
  res.send(`
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      <h2 style="color: #10b981; margin-top: 0;">SkillBridge Backend API</h2>
      <p>This is the Express backend API running on port 3001.</p>
      <p>To view the <strong>web application UI</strong>, visit: <a href="http://localhost:5173" style="color: #2563eb; font-weight: bold;">http://localhost:5173</a></p>
      <p style="color: #666; font-size: 0.9em;">API Health check: <a href="/api/health">/api/health</a></p>
    </div>
  `);
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/users", usersRouter);
app.use("/api/requests", requestsRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/profile", profileRouter);

// Downstream — served TO Farmers-AgroConnect
app.use("/api/experts", expertsRouter);
app.use("/api/skills", skillsRouter);

// Upstream — proxying calls TO Maji Website (see server/services/majiClient.js)
app.use("/api/logistics", logisticsRouter);

// catch-all for unmatched API routes
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

// global error handler — keeps a thrown error (bad JSON body, a DB
// constraint failure, an insufficient-coins guard, etc.) from crashing the
// process or leaking a raw stack trace to the client. Must be defined last,
// and needs all four args for Express to treat it as an error handler.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Something went wrong" });
});

app.listen(PORT, () => {
  console.log(`SkillBridge API running at http://localhost:${PORT}`);
});
