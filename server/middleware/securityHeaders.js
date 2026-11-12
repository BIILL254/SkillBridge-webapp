// server/middleware/securityHeaders.js
//
// Week 14 hardening: a few response headers every response should carry.
// (Small on purpose; this is an API that returns JSON, not a page.)
//   X-Content-Type-Options: nosniff   stop browsers guessing a different content type
//   X-Frame-Options: DENY             never allow the API's pages to be framed
//   Referrer-Policy: no-referrer      do not leak URLs to other sites
//   Cache-Control: no-store           data responses must not be kept by shared caches
//   Strict-Transport-Security         only over HTTPS (behind Render's proxy, via TRUST_PROXY)

// The published docs are static pages; they may be cached normally.
const DOC_PATHS = ["/docs", "/api-docs", "/swagger", "/test", "/openapi.yaml"];
const isDocPath = (p) => DOC_PATHS.some((d) => p === d || p.startsWith(`${d}/`));

export function securityHeaders(req, res, next) {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("Referrer-Policy", "no-referrer");
  if (!isDocPath(req.path)) res.set("Cache-Control", "no-store");
  if (req.secure) res.set("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  next();
}
