// server/utils/expertQuery.js
//
// Validates the query string for GET /experts. v1 and v2 both use this one
// function, so the two versions can never drift apart on what they accept.
//
// Express turns ?lat=1&lat=2 into an array and ?lat[a]=1 into an object. Code
// that assumed a string used to crash on those (a 500); here every value must
// be a plain string, and anything else is a 400 the caller can act on.

const SORTS = ["rating", "proximity"];
const MAX_TEXT = 100;

const bad = (message) => Object.assign(new Error(message), { status: 400 });

// Returns the value if it is a single string, undefined if it is absent.
function single(query, name) {
  const value = query[name];
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw bad(`${name} must be given once, as plain text`);
  return value;
}

function coordinate(query, name, limit) {
  const value = single(query, name);
  if (value === undefined) return undefined;
  const n = Number(value);
  if (value.trim() === "" || !Number.isFinite(n) || Math.abs(n) > limit) {
    throw bad(`${name} must be a number between -${limit} and ${limit}`);
  }
  return value;
}

// aliases: the query names that mean "estate". v1 uses ["estate"]; v2 accepts
// ["location", "estate"] and the first non-empty one wins.
export function parseExpertQuery(query, { aliases = ["estate"] } = {}) {
  const sort = single(query, "sort");
  if (sort !== undefined && !SORTS.includes(sort)) throw bad("sort must be 'rating' or 'proximity'");

  const lat = coordinate(query, "lat", 90);
  const lng = coordinate(query, "lng", 180);
  if (sort === "proximity" && (lat === undefined || lng === undefined)) {
    throw bad("lat and lng are required when sort=proximity");
  }

  let estate;
  for (const name of aliases) {
    const value = single(query, name);
    if (value && estate === undefined) estate = value;
  }
  if (estate !== undefined && estate.length > MAX_TEXT) {
    throw bad(`${aliases[0]} must be at most ${MAX_TEXT} characters`);
  }

  return { estate, sort, lat, lng };
}
