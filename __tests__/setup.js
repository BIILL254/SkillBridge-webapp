// Runs before every test file. Points the API at a throwaway in-memory
// database (fresh, freshly seeded, private to that test file) so the suite
// never reads or writes your real skillbridge.db.
process.env.SKILLBRIDGE_DB = ":memory:";
process.env.NODE_ENV = "test";
// Never let the test suite call the real Maji Website: an empty base URL
// puts majiClient.js in its documented mock-data mode.
process.env.MAJI_API_BASE_URL = "";

// Week 9: the API refuses every request without a valid X-API-Key. These are
// throwaway keys that exist only inside the test run (they are not secrets).
process.env.API_KEYS = "agroconnect:test-key-agroconnect,team:test-key-team";
process.env.WEB_API_KEY = "test-key-web";
// The big suite makes far more than 100 calls a minute; generous limits here,
// and __tests__/ratelimit.test.js sets tiny ones to prove the 429.
process.env.RATE_LIMIT_MAX = "1000000";
process.env.RATE_LIMIT_WEB_MAX = "1000000";
