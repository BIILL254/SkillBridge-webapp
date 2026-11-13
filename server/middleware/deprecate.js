// server/middleware/deprecate.js
//
// Week 13: Deprecation headers for retiring API versions.
// Adds Deprecation, Sunset, and Link headers according to RFC standards.
//
// Week 14 refinements:
//   - `successor` may be a function of the request, so GET /api/v1/experts/13
//     points to /api/v2/experts/13 (not just the list).
//   - After the Sunset date the version can be RETIRED: it answers 410 Gone
//     and names its successor. That is off by default, so nothing breaks
//     before a partner has confirmed they moved; switch it on with
//     V1_ENFORCE_SUNSET=true (or the `enforce` option) once they have.
//   - `now` can be replaced in tests, so the sunset behaviour is testable.

export function deprecated({
  sunset,
  successor,
  enforce = process.env.V1_ENFORCE_SUNSET === "true",
  now = () => Date.now(),
} = {}) {
  const sunsetAt = sunset ? new Date(sunset) : new Date("2026-11-20T00:00:00Z");
  const sunsetHeader = sunsetAt.toUTCString();

  return (req, res, next) => {
    const successorPath = typeof successor === "function" ? successor(req) : successor;

    res.set("Deprecation", "true");
    res.set("Sunset", sunsetHeader);
    if (successorPath) {
      res.set("Link", `<${successorPath}>; rel="successor-version"`);
    }

    if (enforce && now() >= sunsetAt.getTime()) {
      return res.status(410).json({
        error: "This API version has been retired",
        sunset: sunsetHeader,
        ...(successorPath ? { successor: successorPath } : {}),
      });
    }
    next();
  };
}

export default deprecated;
