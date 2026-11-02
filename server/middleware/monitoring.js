// server/middleware/monitoring.js
//
// Week 12: logs say what happened (one line per request), metrics say how much
// (running totals behind GET /api/stats).
//
// LOG RULE, decided before writing any code. Each line holds:
//     time, method, path, status, ms, caller
// and NEVER: an API key or token (even partly), a password, a request or
// response body, or a query string (they can carry emails, tokens and names).
// "caller" is the consumer's NAME ("agroconnect", "skillbridge-web"), taken from
// the key check, so it separates our tests from a partner's traffic without
// the key itself ever being written. Requests with no valid key are "none".
//
// ORDER MATTERS: app.js registers monitor() FIRST, before the key check and the
// rate limiter, so rejected requests (401, 429) are logged too. Those are the
// requests you most want to see.
//
// The numbers live in memory: they reset when the server restarts, and they
// would be wrong across several server copies. That is fine for this course;
// production systems send them to a shared tool.

import crypto from "crypto";

const round = (n) => Math.round(n * 10) / 10;

export function fingerprintApiKey(key) {
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 6);
}

const stats = {
  startedAt: new Date().toISOString(),
  total: 0,
  clientErrors: 0, // 4xx: usually the caller's mistake
  serverErrors: 0, // 5xx: our fault
  totalMs: 0,
  routes: {},
  events: {}, // named counters, e.g. partner fallbacks (see countEvent)
};

const MAX_ROUTES = 200; // a safety cap so odd traffic can't grow the table forever
const newRoute = () => ({
  count: 0,
  clientErrors: 0,
  serverErrors: 0,
  totalMs: 0,
  maxMs: 0,
});

// Where log lines go. Printing is off while the test suite runs (it would
// bury the results); the monitoring tests switch it on with setLogSink().
let sink = process.env.NODE_ENV === "test" ? null : (line) => console.log(line);
export function setLogSink(fn) {
  sink = fn;
}

export function resetStats() {
  stats.startedAt = new Date().toISOString();
  stats.total = stats.clientErrors = stats.serverErrors = stats.totalMs = 0;
  stats.routes = {};
  stats.events = {};
}

// A named counter shown under "events" in /stats, for things that are not
// requests (for example: "the saved copy of Maji's data was served").
export function countEvent(name) {
  stats.events[name] = (stats.events[name] || 0) + 1;
}

// The path only, never the query string. originalUrl (not req.path) because
// inside a router req.path has the router's prefix cut off.
const pathOf = (req) =>
  String(req.originalUrl || req.url || "")
    .split("?")[0]
    .slice(0, 200);

// Group by route PATTERN: /api/experts/1 and /api/experts/2 both become
// "/api/experts/:id". Raw paths would give every id its own row, forever.
// Rebuilt from the URL and the matched pattern, because by the time a response
// is finished (especially after an error) Express has already forgotten which
// router mount the route was found under.
export function routePattern(req) {
  if (!req.route || typeof req.route.path !== "string") return null;
  const pattern = req.route.path;
  const parts = pathOf(req).split("/").filter(Boolean);
  const patternParts = pattern.split("/").filter(Boolean);
  const base = parts
    .slice(0, Math.max(0, parts.length - patternParts.length))
    .join("/");
  const tail = patternParts.length ? `/${patternParts.join("/")}` : "";
  return `${base ? `/${base}` : ""}${tail}` || "/";
}

export function monitor(req, res, next) {
  // The host's uptime check hits /api/health every few seconds. Counting it
  // would drown real traffic and drag the averages down, so it is skipped
  // unless you set MONITOR_HEALTH=1.
  if (req.path === "/api/health" && !process.env.MONITOR_HEALTH) return next();

  const start = process.hrtime.bigint();

  res.on("finish", () => {
    // after the response is sent: status and timing are final
    const ms = Number(process.hrtime.bigint() - start) / 1e6;

    if (sink) {
      sink(
        JSON.stringify({
          time: new Date().toISOString(),
          method: req.method,
          path: pathOf(req), // path only: no query string
          status: res.statusCode,
          ms: round(ms),
          caller: req.apiConsumer || "none", // a name, never the key
        }),
      );
    }

    const pattern = routePattern(req);
    let label = `${req.method} ${pattern ?? "(no route)"}`;
    if (!stats.routes[label] && Object.keys(stats.routes).length >= MAX_ROUTES)
      label = "(other)";
    const r = stats.routes[label] || (stats.routes[label] = newRoute());

    stats.total += 1;
    stats.totalMs += ms;
    r.count += 1;
    r.totalMs += ms;
    r.maxMs = Math.max(r.maxMs, ms);
    if (res.statusCode >= 500) {
      stats.serverErrors += 1;
      r.serverErrors += 1;
    } else if (res.statusCode >= 400) {
      stats.clientErrors += 1;
      r.clientErrors += 1;
    }
  });

  next();
}

export function statsHandler(req, res) {
  const routes = {};
  for (const [label, r] of Object.entries(stats.routes)) {
    routes[label] = {
      count: r.count,
      clientErrors: r.clientErrors,
      serverErrors: r.serverErrors,
      avgMs: round(r.totalMs / r.count),
      maxMs: round(r.maxMs),
    };
  }
  const rate = stats.total ? (stats.serverErrors / stats.total) * 100 : 0;
  const avg = stats.total ? stats.totalMs / stats.total : 0;
  res.json({
    startedAt: stats.startedAt,
    uptimeSeconds: Math.round(process.uptime()),
    total: stats.total,
    clientErrors: stats.clientErrors,
    serverErrors: stats.serverErrors,
    errorRatePercent: round(rate), // 5xx only: a 4xx is usually the caller's mistake
    avgMs: round(avg),
    routes,
    events: { ...stats.events },
  });
}
