// server/middleware/errorHandler.js
//
// The global Express error handler (must be registered last).
//
// Security rule: a client only ever sees messages that OUR code wrote on
// purpose (validation errors, "Insufficient Skill Coins", ...). Anything
// unexpected - a database error, a typo-caused TypeError - is logged on the
// server and the client just gets a generic 500, because raw messages from
// those can contain table names, SQL, or file paths.

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  // body-parser (express.json) failures: don't echo parser internals
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body is not valid JSON" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large" });
  }

  // Our own code sets err.status on errors meant for the client.
  const deliberate = Number.isInteger(err.status) && err.status >= 400 && err.status < 600;
  if (!deliberate) {
    if (process.env.NODE_ENV !== "test") console.error(err); // full detail stays in the server log
    return res.status(500).json({ error: "Something went wrong" });
  }

  if (err.status >= 500 && process.env.NODE_ENV !== "test") console.error(err);
  res.status(err.status).json({ error: err.message || "Something went wrong" });
}
