// server/middleware/apiKey.js
//
// Week 9: API key authentication + rate limiting.
//
// Two layers of identity exist in SkillBridge and they answer different
// questions:
//   - the API key (this file) says WHICH APPLICATION is calling: our own web
//     app, AgroConnect, a teammate testing. Sent as "X-API-Key".
//   - the bearer token (middleware/auth.js) says WHICH LOGGED-IN STUDENT is
//     acting, for the endpoints that are about a person.
// Every request (except /api/health and the public docs pages) must pass the
// key check first; the route handler never runs without a valid key.
//
// Keys live in environment variables, never in source code:
//   API_KEYS      partner and team keys, "name:key" pairs separated by commas,
//                 e.g.  agroconnect:3f9a...,team:77c1...
//                 (a bare key with no name is accepted and named consumer-1, ...)
//   WEB_API_KEY   the key our own React app sends (see VITE_API_KEY). It is
//                 baked into the public frontend bundle, so it identifies our
//                 app but is NOT a secret — real user security is the login.

import crypto from "crypto";

// "name:key,name:key" -> [{ name, key }]. Blank entries are ignored.
export function parseApiKeys(raw) {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry, i) => {
      const colon = entry.indexOf(":");
      if (colon === -1) return { name: `consumer-${i + 1}`, key: entry };
      return { name: entry.slice(0, colon).trim() || `consumer-${i + 1}`, key: entry.slice(colon + 1).trim() };
    })
    .filter((c) => c.key);
}

// Hash both sides to a fixed length, then compare in constant time, so the
// comparison time does not reveal how much of a guessed key was correct.
const digest = (s) => crypto.createHash("sha256").update(String(s)).digest();
function sameKey(a, b) {
  return crypto.timingSafeEqual(digest(a), digest(b));
}

export const WEB_CONSUMER = "skillbridge-web";

// Builds the middleware from the given key lists (defaults: the environment).
// Fails CLOSED: if no keys are configured, every request gets 401.
export function createRequireApiKey({
  partnerKeys = process.env.API_KEYS,
  webKey = process.env.WEB_API_KEY,
} = {}) {
  const consumers = parseApiKeys(partnerKeys);
  if (webKey && webKey.trim()) consumers.push({ name: WEB_CONSUMER, key: webKey.trim() });

  if (consumers.length === 0 && process.env.NODE_ENV !== "test") {
    console.warn(
      "[SkillBridge] No API keys configured (API_KEYS / WEB_API_KEY are empty): " +
      "every request except /api/health will be rejected with 401."
    );
  }

  return function requireApiKey(req, res, next) {
    const sent = req.get("X-API-Key");
    let match = null;
    if (sent) {
      // check every key (no early exit) so timing does not depend on which one matched
      for (const c of consumers) if (sameKey(sent, c.key)) match = c;
    }
    if (!match) {
      return res.status(401).json({ error: "Missing or invalid API key" });
    }
    req.apiConsumer = match.name; // the NAME, never the key itself
    next();
  };
}

// In-memory fixed-window limiter. Runs AFTER requireApiKey, so only callers
// with a valid key ever get a counter (bad-key traffic cannot grow the map,
// and cannot use up a real consumer's allowance).
//   - partner/team keys are counted per key (the key IS the identity)
//   - the web app's key is public, so its callers are counted per IP address
//     instead; otherwise every student on the site would share one allowance
// Limits live in memory: they reset on restart and do not work across several
// server copies (production would use a shared store such as Redis).
export function createRateLimit({ windowMs = 60_000, max = 100, webMax = 300 } = {}) {
  const hits = new Map(); // id -> { count, resetAt }
  return function rateLimit(req, res, next) {
    const isWeb = req.apiConsumer === WEB_CONSUMER;
    const id = isWeb ? `${WEB_CONSUMER}|${req.ip}` : req.apiConsumer;
    const limit = isWeb ? webMax : max;
    const now = Date.now();

    // many different web-app IP addresses could otherwise grow this map
    // forever: drop expired counters whenever it gets large
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (now >= v.resetAt) hits.delete(k);
    }

    let entry = hits.get(id);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(id, entry);
    }
    entry.count += 1;

    res.set("X-RateLimit-Limit", String(limit));
    res.set("X-RateLimit-Remaining", String(Math.max(0, limit - entry.count)));

    if (entry.count > limit) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({ error: "Too many requests", retryAfter });
    }
    next();
  };
}
