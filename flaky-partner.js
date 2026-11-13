// flaky-partner.js
//
// Stand-in partner for Week 11 Resilience testing.
// Simulates a partner API with 4 switchable failure modes:
//   - ok: returns immediately (normal fast response)
//   - slow: waits 10 seconds before answering (tests client timeout)
//   - flaky: fails twice with 503, then succeeds on the 3rd try (tests client retries)
//   - error: always fails with 500 (tests retries exhaust and graceful fallback)
//
// Switch modes anytime via curl without restarting:
//   curl http://localhost:4000/__mode/ok
//   curl http://localhost:4000/__mode/slow
//   curl http://localhost:4000/__mode/flaky
//   curl http://localhost:4000/__mode/error

import express from "express";

const app = express();
app.use(express.json());

let mode = "ok"; // ok | slow | flaky | error
let calls = 0;

// Handout stand-in tasks
const tasks = [
  { id: 1, title: "Write README", dueDate: "2026-11-02", status: "active" },
  { id: 2, title: "Ship v1", dueDate: "2026-11-09", status: "active" },
];

// Maji Website vendor and logistics stand-in data
const vendorsLocations = [
  { vendorId: 1, businessName: "Chemchemi Fresh Water Co.", estate: "Kasarani" },
  { vendorId: 2, businessName: "Kileleshwa Fresh Water", estate: "Kileleshwa" },
  { vendorId: 3, businessName: "Lavington Water Hub", estate: "Lavington" },
];

const vendorsAll = [
  { vendorId: 1, businessName: "Chemchemi Fresh Water Co.", estate: "Kasarani", rating: 4.2, isVerified: true, isOnline: true, ownerName: "Mock Owner One", phone: "0700000001" },
  { vendorId: 2, businessName: "Kileleshwa Fresh Water", estate: "Kileleshwa", rating: 4.8, isVerified: true, isOnline: true, ownerName: "Mock Owner Two", phone: "0700000002" },
];

const vendorsTopRated = [
  { vendorId: 1, businessName: "Chemchemi Fresh Water Co.", estate: "Kasarani", rating: 4.8, isVerified: true, isOnline: true },
  { vendorId: 2, businessName: "Kileleshwa Fresh Water", estate: "Kileleshwa", rating: 4.9, isVerified: true, isOnline: true },
];

const activeEstates = [
  { estate: "Kasarani" },
  { estate: "Kileleshwa" },
  { estate: "Lavington" },
  { estate: "Westlands" },
];

// Switch behaviour without restarting: curl http://localhost:4000/__mode/slow
app.get("/__mode/:m", (req, res) => {
  mode = req.params.m;
  calls = 0;
  console.log(`[flaky-partner] Mode switched to: ${mode} (call counter reset to 0)`);
  res.json({ mode });
});

// Common handler to apply failure mode to any endpoint
async function handleWithMode(req, res, data) {
  calls += 1;
  const currentCall = calls;
  console.log(`[flaky-partner] ${req.method} ${req.originalUrl} (call ${currentCall}, mode: ${mode})`);

  if (mode === "slow") {
    // Deliberately delay 10 seconds — client timeout (1.5s) should abort long before
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }

  if (mode === "flaky" && currentCall % 3 !== 0) {
    // Fails twice, then succeeds on call 3
    return res.status(503).json({ message: "Try again (flaky simulation)" });
  }

  if (mode === "error") {
    // Always fails with 500 Internal Server Error
    return res.status(500).json({ message: "Internal error (error simulation)" });
  }

  res.json(data);
}

// Handout tasks endpoint
app.get("/tasks", (req, res) => handleWithMode(req, res, tasks));

// Maji Website live endpoints (so SkillBridge can point at localhost:4000 directly)
app.get("/api/vendors/locations", (req, res) => {
  const { estate } = req.query;
  const filtered = estate
    ? vendorsLocations.filter((v) => v.estate.toLowerCase() === estate.toLowerCase())
    : vendorsLocations;
  handleWithMode(req, res, filtered);
});

app.get("/api/vendors/all", (req, res) => {
  const { estate } = req.query;
  const filtered = estate
    ? vendorsAll.filter((v) => v.estate.toLowerCase() === estate.toLowerCase())
    : vendorsAll;
  handleWithMode(req, res, filtered);
});

app.get("/api/vendors/top-rated", (req, res) => handleWithMode(req, res, vendorsTopRated));
app.get("/api/orders/active/estates", (req, res) => handleWithMode(req, res, activeEstates));
// v2 (Maji notice, 12 Nov 2026): the same list, wrapped as { data, count }
app.get("/api/v2/orders/active/estates", (req, res) =>
  handleWithMode(req, res, { data: activeEstates, count: activeEstates.length }),
);
app.get("/api/orders/active/schedules", (req, res) => handleWithMode(req, res, []));

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Stand-in partner running on http://localhost:${PORT}`);
  console.log(`Switch modes via GET http://localhost:${PORT}/__mode/:mode (ok | slow | flaky | error)`);
});

