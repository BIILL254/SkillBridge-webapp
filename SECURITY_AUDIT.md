# Security Audit: Week 9

Project: SkillBridge API. Date: 26 October 2026.

This covers the three jobs from the lab: know who is calling (API keys), limit how much one caller can do (rate limiting), and check what responses give away (data exposure). The audit read the code behind every route and then pinned each finding down with automated tests (`__tests__/apikey.test.js`, `ratelimit.test.js`, `security.test.js`). The whole suite passes: 371 tests in 13 suites.

## 1. Who calls the API, and their keys (Part A)

Each consumer has its own key, so one can be revoked without breaking the others.

| Consumer | Key name | Where the key lives | Key sent privately? |
| :--- | :--- | :--- | :--- |
| Farmers-AgroConnect (downstream ring partner) | `agroconnect` | `API_KEYS` environment variable | [ ] fill in when sent |
| Our own team, for testing | `team` | `API_KEYS` environment variable | [ ] fill in when sent |
| Our own React web app | `skillbridge-web` | `WEB_API_KEY` (server) and `VITE_API_KEY` (frontend build) | not needed, it is deployed with the site |

Maji Website is not a consumer: we call them, they do not call us.

How it works:
* The caller sends `X-API-Key: <key>` on every request. The check (`server/middleware/apiKey.js`) is registered before every route and before the body parser, so no handler runs without a valid key.
* Keys live only in environment variables (a local `.env`, or Render's Environment tab). `.env` is in `.gitignore`; `.env.example` holds placeholders only.
* **Rule: every endpoint requires a key.** The only exceptions are `GET /api/health` and the published documentation (`/docs`, `/api-docs`, `/swagger`, `/test`, `/openapi.yaml`). Justification: the health check is what a host's uptime monitor calls and it returns only `{"status":"ok"}`; the docs are static pages with no user data, and a stranger needs them to learn how to ask for a key in the first place. Browser CORS preflights (`OPTIONS`) are answered without a key because browsers cannot attach one; they carry no data.
* The root aliases AgroConnect uses (`/experts`, `/skills`, `/requests`) are registered after the key check, so they need a key exactly like the `/api` versions (pinned by tests in `__tests__/apikey.test.js`).
* A missing or wrong key returns `401 {"error":"Missing or invalid API key"}`. The two cases are deliberately identical.
* The check is constant-time (both sides hashed, then compared with `crypto.timingSafeEqual`) and fails closed: with no keys configured, everything is rejected.
* Status codes: `401` = "I do not know who you are" (bad key, or no login). `403` = "I know who you are and you may not do this" (a student on an admin route, or on someone else's session or request).
* The API key and the student login are separate layers. The key says which *application* is calling; the bearer token says which *student* is acting, and still protects profile, sessions, admin and logistics.

## 2. Rate limit (Part C)

* **Limit: 100 requests per minute per partner or team key.** Our own web app is counted per visitor IP address instead, at 300 per minute.
* **Why 100.** It is the handout's default and it fits real use: a farmer's screen in AgroConnect makes a handful of calls (list experts, one profile, availability, reviews), so one consumer serving many users stays well under 100 a minute. A buggy loop in a partner's code, or an attacker with a key, would hit 100 in well under a second and be stopped, which is the point.
* **Why the web app is different.** Its key is baked into the public frontend bundle, so it is not a secret and every student shares it. A single shared allowance would let one busy student lock everyone out, so it is counted per IP at 300 a minute (a page load makes about 5 calls). On Render this needs `TRUST_PROXY=1` (already in `render.yaml`) so visitors are told apart by real address.
* **What a blocked caller sees:** `429`, a `Retry-After: <seconds>` header, and `{"error":"Too many requests","retryAfter":<seconds>}`. Every response also carries `X-RateLimit-Limit` and `X-RateLimit-Remaining`.
* Bad-key requests are rejected before the limiter, so they can neither use up a real consumer's allowance nor grow the counter table.
* The existing login limiter (10 attempts per 15 minutes per IP) and signup limiter stay as they were.
* **Honest limits:** the counters live in memory, so they reset when the server restarts and would not work across several server copies. Production would use a shared store such as Redis.

**Demonstration** (real output from the running server, throwaway keys, limit lowered to 3; run it yourself and keep your own copy for the deliverable):

```text
curl -i http://localhost:3001/api/experts                       -> HTTP/1.1 401 Unauthorized
                                                                   {"error":"Missing or invalid API key"}
curl -i -H "X-API-Key: wrong" http://localhost:3001/api/experts -> HTTP/1.1 401 Unauthorized
curl -i -H "X-API-Key: <your-api-key>" .../api/experts          -> HTTP/1.1 200 OK

for i in 1 2 3 4 5; do curl -s -o /dev/null -w "%{http_code} " -H "X-API-Key: <your-api-key>" http://localhost:3001/api/experts; done
200 200 200 429 429

HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 3
X-RateLimit-Remaining: 0
Retry-After: 60
{"error":"Too many requests","retryAfter":60}
```

## 3. Self-audit checklist (Part D)

### Sensitive fields: any password hash, token, internal flag or email a consumer should not see?
* **Looked at:** every response builder: `toSafeUser`, `getUsers`, `toExpert`, `getExpertReviews`, the admin user list, `getProfile`, the auth routes. All use explicit field lists, never raw database rows.
* **Found:** nothing wrong. No password hash, token or `password_hash` column appears in any response; a test scans every readable endpoint for them. A login token is only returned to the person who just logged in or signed up. Public listings (`/api/users`, `/api/experts`) contain no phone numbers, usernames or roles. Phone and username appear only in a user's own account and in the admin list, which needs them.
* **Accepted:** the expert listing includes the latitude and longitude of the person's estate (an area centre, not a home address). The contract needs it for sort-by-proximity.

### Other people's data: can a caller read or change records that are not theirs by changing an id?
* **Looked at:** every route that takes an id or returns a list: requests, sessions, profile, users, admin.
* **Found, and fixed:** `GET /api/sessions` returned **every user's sessions** to any logged-in user, and `PATCH /api/sessions/:id` let any logged-in user mark anyone's session as reviewed. The sessions table had no owner.
  * **Fix:** added a `user_id` owner column (with a migration for existing databases; old rows with no recorded owner are assigned to user 1, the demo account that owns the seed sessions). `GET` now returns only your sessions, new sessions take the owner from the login token (never the body), and `PATCH` on someone else's session returns `403` (`404` if it does not exist). The expert availability endpoint still treats a slot booked by anyone as taken, but reads only the date and time, never who booked it.
* **Checked, already correct:** requests are limited to the sender or recipient (`403` otherwise, fixed in Week 7); profile and `/auth/me` come from the token, not an id in the URL; admin routes return `403` to students.
* **Accepted:** `GET /api/users/:id` is a public directory entry by design (name, skills, rating, estate).
* **Accepted, vendor contact details:** `GET /api/logistics/vendors/all` returns each Maji vendor's owner name and phone number, so students can reach a vendor who is meant to teach them. It needs the API key and a student login. The top-rated route drops these fields.

### Error messages: stack traces, file paths, queries or table names?
* **Looked at:** the global error handler, plus real error responses: malformed JSON, oversized bodies, duplicate signup, SQL-looking input, unknown routes.
* **Found, and fixed:** the global handler returned `err.message` for every error, so an unexpected database failure would have sent text like `UNIQUE constraint failed: users.username` to the client. Now an error the code raised on purpose (it sets a status, for example "That username is already taken") keeps its message; anything unexpected is logged on the server and the client gets `500 {"error":"Something went wrong"}`. JSON parse errors now return a fixed `"Request body is not valid JSON"` instead of the parser's internals, oversized bodies return `413`, and the `X-Powered-By: Express` header is removed.
* **Checked:** SQL-looking input in login, skills and experts filters is treated as plain data (all queries are parameterised); the users table survives a `DROP TABLE` attempt.

### Write endpoints: can a caller send an extra field such as `isAdmin` or `id` and have it saved?
* **Looked at:** signup, admin create and edit, profile edit, requests, sessions, coins.
* **Found, nothing wrong:** each handler picks named fields only (or a whitelist, for profile and admin edits), so `role`, `id`, `rating`, `coins`, `fromId`, `status` and `userId` in a body are ignored. Pinned by tests: a signup that sends `role: "admin"` produces a normal user with 5 welcome coins.
* **Found, and fixed:** `PATCH /api/profile/coins` accepted any number, so any logged-in user could give themselves a million coins in one request. It now accepts whole numbers of at most 10 per call (the app never awards more than 2), and `reason` must be a string of at most 120 characters. Overdrawing is still refused as before.
* **Still open (honest limitation):** the frontend, not the server, decides when coins are awarded, so a user can still call the endpoint repeatedly (slowed by the rate limit). The proper fix is to award coins on the server when a request is accepted or a session is reviewed. This builds on the non-idempotent coin endpoint already recorded in `src/documentation/CONTRACT_DEVIATIONS.md`.

### Keys in the wrong place: committed, logged, or in the README?
* **Looked at:** a scan of the whole working tree for long key-like strings and the words key, secret and password; every `console.*` call in `server/`.
* **Found:** no real key anywhere in the source, `.env.example`, `render.yaml`, README or docs (all use placeholders such as `<your-api-key>`). `.env` is in `.gitignore`. Nothing logs a key or token; the only related log line is a startup warning when no keys are configured, and it prints no values.
* **Git history:** this audit could only inspect the working files, not the repository history. Before pushing, run these two commands; both should print nothing:
  ```bash
  git log --all --oneline -- .env
  git log --all -p -S"WEB_API_KEY=" -- . ":(exclude).env.example" ":(exclude)README.md" ":(exclude)render.yaml" ":(exclude)SECURITY_AUDIT.md"
  ```
* **By design:** `VITE_API_KEY` is visible to anyone who opens the website's JavaScript. That is why the web key identifies our app and is rate limited per visitor, while student data is protected by the login.
* **Known weak spot:** seeded demo accounts use the password `1234` (the admin uses the `ADMIN_PASSWORD` environment variable). Every account is forced to change it at first login, and logins are limited to 10 attempts per 15 minutes per IP, but a public deployment should set `ADMIN_PASSWORD` and `SEED_PASSWORD`.

## 4. What changed in the code

| File | Change |
| :--- | :--- |
| `server/middleware/apiKey.js` (new) | key check, per-key rate limiter |
| `server/middleware/errorHandler.js` (new) | generic 500s, fixed parse-error messages |
| `server/app.js` | key and limiter registered before every route; docs and health kept public; `X-Powered-By` removed; optional `TRUST_PROXY` |
| `server/db.js`, `server/routes/sessions.routes.js` | sessions scoped to their owner (migration included) |
| `server/routes/profile.routes.js` | coin grant cap and `reason` validation |
| `src/api.js` | the web app sends its own `X-API-Key` |
| `openapi.yaml`, `docs/` | `apiKeyAuth` scheme, `401` and `429` on every operation, docs rebuilt |
| `README.md`, `.env.example`, `render.yaml` | real auth and rate-limit instructions, new environment variables |
| `__tests__/` | every call now carries a key; new `apikey`, `ratelimit` and `security` suites |

## 5. Tests

`npm test` passes: 13 suites, 371 tests (the 272 from Week 7 plus 99 added since: 70 in Week 9, 2 for the Swagger page and root alias, 27 for the root-alias key checks and the Maji vendor endpoints). New tests cover: no key gets `401` on 13 endpoints including login and unknown paths; a wrong key gets `401` in 7 variations; every valid consumer key gets `200`; the real `429` with `Retry-After`; limits are per key; and each audit finding above. Several were checked by deliberately breaking the code (removing the key check, the limiter, the session ownership check, and the error masking) and confirming the tests fail.

## 6. Deployment note

The API now rejects every request until keys are configured. On Render, set `API_KEYS` and `WEB_API_KEY` (and `TRUST_PROXY=1`) on the API service, and `VITE_API_KEY` (same value as `WEB_API_KEY`) on the web service, then redeploy the web service so the key is baked into the build. Enter each value by itself in the Value box, without the variable name or `=`.
