// scripts/traffic.js (Week 12, Part D): sends a random mix of requests to the
// API so the log and /api/stats have something to show.
//
//   API=http://localhost:3001 KEY=<your-key> node scripts/traffic.js
//   API=https://skillbridge-api-p6s9.onrender.com KEY=<your-key> N=200 node scripts/traffic.js
//
// PowerShell:  $env:API="http://localhost:3001"; $env:KEY="<your-key>"; node scripts/traffic.js
// Plain Node 18+, no packages. The paths below are SkillBridge's own.

const API = process.env.API || "http://localhost:3001";
const KEY = process.env.KEY;
const N = Number(process.env.N || 60);
const PAUSE_MS = Number(process.env.PAUSE_MS || 50);

if (!KEY) {
  console.error(
    "Set KEY to an API key first, e.g.  KEY=<your-key> node scripts/traffic.js",
  );
  process.exit(1);
}

// A weighted mix: mostly good requests, some mistakes, some strangers.
const mix = [
  { method: "GET", path: "/api/experts", key: true },
  { method: "GET", path: "/api/experts", key: true },
  {
    method: "GET",
    path: "/api/experts?estate=Westlands&sort=rating",
    key: true,
  },
  { method: "GET", path: "/api/experts/13", key: true },
  { method: "GET", path: "/api/experts/13/availability", key: true },
  { method: "GET", path: "/api/experts/13/reviews", key: true },
  { method: "GET", path: "/api/skills?tag=Agronomy", key: true },
  { method: "GET", path: "/api/experts/9999", key: true }, // no such expert: 404
  { method: "GET", path: "/api/experts?sort=banana", key: true }, // bad input: 400
  { method: "GET", path: "/api/experts", key: false }, // no key at all: 401
  { method: "GET", path: "/api/not-a-route", key: true }, // no such path: 404
  {
    method: "POST",
    path: "/api/requests",
    key: true, // a consultation booking
    body: {
      farmerName: "Traffic Test",
      topic: "Irrigation Systems",
      expertId: 13,
      date: "2026-12-01T10:00:00Z",
    },
  },
];

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const counts = {};
for (let i = 0; i < N; i++) {
  const r = mix[Math.floor(Math.random() * mix.length)];
  try {
    const res = await fetch(API + r.path, {
      method: r.method,
      headers: {
        ...(r.key ? { "X-API-Key": KEY } : {}),
        ...(r.body ? { "Content-Type": "application/json" } : {}),
      },
      body: r.body ? JSON.stringify(r.body) : undefined,
    });
    counts[res.status] = (counts[res.status] || 0) + 1;
  } catch {
    counts.failed = (counts.failed || 0) + 1;
  }
  await pause(PAUSE_MS);
}
console.log("Status codes received:", counts);
