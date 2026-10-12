// Runs before every test file. Points the API at a throwaway in-memory
// database (fresh, freshly seeded, private to that test file) so the suite
// never reads or writes your real skillbridge.db.
process.env.SKILLBRIDGE_DB = ":memory:";
process.env.NODE_ENV = "test";
// Never let the test suite call the real Maji Website: an empty base URL
// puts majiClient.js in its documented mock-data mode.
process.env.MAJI_API_BASE_URL = "";
