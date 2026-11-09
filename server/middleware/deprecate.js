// server/middleware/deprecate.js
//
// Week 13: Deprecation headers for retiring API versions.
// Adds Deprecation, Sunset, and Link headers according to RFC standards.

export function deprecated({ sunset, successor } = {}) {
  const sunsetDate = sunset ? new Date(sunset).toUTCString() : "Fri, 20 Nov 2026 00:00:00 GMT";
  return (req, res, next) => {
    res.set("Deprecation", "true");
    res.set("Sunset", sunsetDate);
    if (successor) {
      res.set("Link", `<${successor}>; rel="successor-version"`);
    }
    next();
  };
}

export default deprecated;

