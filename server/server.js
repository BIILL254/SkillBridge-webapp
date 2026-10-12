// server/server.js
//
// The SkillBridge API entry point. Run it with `npm run server` (or
// `npm run server:dev` for auto-restart on save). It listens on port 3001
// by default and the React app (running separately on port 5173 via
// `npm run dev`) talks to it over HTTP — see src/api.js on the frontend side.
//
// All the actual app setup lives in app.js so the tests can import the app
// without also opening a network port.

import app from "./app.js";

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`SkillBridge API running at http://localhost:${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n[SkillBridge] Port ${PORT} is already in use by another process.`);
    console.error(`Either stop the other process on port ${PORT}, or run with a custom port:`);
    console.error(`  PORT=3002 npm start\n`);
    process.exit(1);
  } else {
    console.error("Server error:", err);
  }
});
