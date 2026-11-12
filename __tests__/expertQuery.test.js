// Unit tests for the shared GET /experts query validation (server/utils/expertQuery.js).

import { parseExpertQuery } from "../server/utils/expertQuery.js";

const fails = (query, message, options) => {
  let error;
  try {
    parseExpertQuery(query, options);
  } catch (e) {
    error = e;
  }
  expect(error).toBeDefined();
  expect(error.status).toBe(400);
  expect(error.message).toMatch(message);
};

describe("parseExpertQuery", () => {
  test("an empty query is fine", () => {
    expect(parseExpertQuery({})).toEqual({ estate: undefined, sort: undefined, lat: undefined, lng: undefined });
  });

  test("passes valid values through unchanged", () => {
    expect(parseExpertQuery({ estate: "Ruiru", sort: "proximity", lat: "-1.2", lng: "36.9" })).toEqual({
      estate: "Ruiru",
      sort: "proximity",
      lat: "-1.2",
      lng: "36.9",
    });
  });

  test("rejects a sort that is not in the list", () => {
    fails({ sort: "name" }, /sort must be/);
  });

  test("rejects lat and lng that are not numbers or are out of range", () => {
    fails({ lat: "abc" }, /lat must be a number between -90 and 90/);
    fails({ lat: "91" }, /lat must be a number/);
    fails({ lng: "181" }, /lng must be a number between -180 and 180/);
    fails({ lat: "" }, /lat must be a number/);
    fails({ lat: "Infinity" }, /lat must be a number/);
  });

  test("sort=proximity needs both lat and lng", () => {
    fails({ sort: "proximity" }, /lat and lng are required/);
    fails({ sort: "proximity", lat: "1" }, /lat and lng are required/);
  });

  test("a repeated or nested parameter is a 400, not a crash", () => {
    fails({ lat: ["1", "2"] }, /lat must be given once/);
    fails({ lng: { a: "1" } }, /lng must be given once/);
    fails({ sort: ["rating", "x"] }, /sort must be given once/);
    fails({ estate: ["a", "b"] }, /estate must be given once/);
  });

  test("v2 accepts location, falls back to estate, and prefers location", () => {
    const opts = { aliases: ["location", "estate"] };
    expect(parseExpertQuery({ location: "Ruiru" }, opts).estate).toBe("Ruiru");
    expect(parseExpertQuery({ estate: "Ruiru" }, opts).estate).toBe("Ruiru");
    expect(parseExpertQuery({ location: "Ruiru", estate: "Karen" }, opts).estate).toBe("Ruiru");
    expect(parseExpertQuery({ location: "", estate: "Karen" }, opts).estate).toBe("Karen");
    fails({ location: ["a", "b"] }, /location must be given once/, opts);
  });

  test("an estate longer than 100 characters is rejected", () => {
    fails({ estate: "a".repeat(101) }, /at most 100 characters/);
  });
});
