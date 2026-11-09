# Individual Retrospective Report: SkillBridge

**Course:** Internet Application Programming & Advanced Networking (Week 14)  
**Author:** Bill Amani  
**Project:** SkillBridge (Team 5 — Peer-Learning & Expert Discovery Platform)  
**API Ring:** Ring 3 (Upstream: Team 4 — Maji Website | Downstream: Team 11 — Farmers-AgroConnect)  

---

## 1. The Hardest Part of the Lifecycle

Across the fourteen weeks, the hardest stage was **Integration and Resilience (Weeks 10 and 11)**. Before Week 10, our mental model assumed that HTTP requests were deterministic: send a valid request to a route and receive a timely JSON response. The moment our application relied on an external partner hosted on Render's free tier, that assumption dissolved.

The difficulty was engineering for third-party unpredictability. When we first fetched water station coordinates from Team 4 (Maji Website), their free cloud instances were frequently asleep, causing cold-start delays over 30 seconds that triggered socket timeouts in Node.js. In addition, their live endpoints differed from early design contracts.

To solve this, we redesigned our fetching pipeline. We built `resilientFetch.js` with a 1500ms timeout boundary, exponential backoff retries (200ms to 400ms), and an in-memory `savedCopies` fallback cache in `majiClient.js`. Making the user interface gracefully acknowledge when live partner data was down—displaying an amber banner with the exact timestamp of saved data rather than showing an unhandled 502 or crashing—forced us to learn how production distributed systems must handle failure.

---

## 2. One Real Cross-Team Issue

Our primary cross-team breakage occurred on **October 28, 2026**, when connecting our dashboard’s Logistics card to Maji Website’s vendor locations endpoint.

Our Week 4 OpenAPI contract specified `GET /api/vendors/stations` returning `{ id, name, deliveryStatus }`. When we called their live service, `GET /api/vendors/stations` returned `404 Not Found`. After consulting Team 4, we learned they had deployed a revised route: `GET /api/vendors/locations?estate=Kasarani`.

However, consuming this new route caused every vendor card in our UI to display `undefined` for vendor names. Inspecting the raw HTTP payload with `curl.exe -i`:
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

[{"vendorId":10,"businessName":"Kasarani Fresh Water","estate":"Kasarani"}]
```
The status was `200 OK`, but Maji used `"businessName"`, whereas our component expected `"name"`.

Rather than waiting for Team 4 to refactor their backend, I built a normalization adapter in `server/services/partner.js` (`majiClient.js`). The adapter sanitized incoming payloads by mapping `v.businessName || v.vendorName || "Unknown Vendor"` into our internal schema. This took 45 minutes to implement and test. When Maji later migrated to v2 in Week 13 by wrapping responses in `{ data: [...], count }`, our adapter isolated SkillBridge so not a single frontend file had to change.

---

## 3. What I Would Design Differently

If starting SkillBridge over, I would change two architectural decisions:

First, **I would establish a standardized response and error envelope in Week 3 before writing routes.** Initially, success payloads varied between bare arrays, nested objects, and raw strings. Our error schema changed three separate times: from `{ message }` in Week 5, to `{ error }` in Week 8, and finally to `{ error, retryAfter }` in Week 9 for rate limiting. This forced repetitive client updates. Agreeing on a strict `{ data, error, meta }` envelope early would have prevented contract drift.

Second, **I would introduce Redis for persistence and rate limiting from Week 5 instead of in-memory maps.** Our in-memory rate limiter and `savedCopies` cache are bound to a single Node process and clear whenever Render restarts. In a clustered container environment, this architecture cannot scale horizontally without losing state.

What I would keep is our **OpenAPI-first workflow** and our Jest test suite (445 tests). Automated tests asserting exact JSON shapes caught multiple regressions before deployment.

---

## 4. My Contribution

I rate my overall contribution to SkillBridge as **8.5 out of 10**.

**What I Owned:**
* Designed the Express REST architecture (`server/app.js`, `server/db.js`), database migrations, and seeded 14 verified expert mentors.
* Built the security middleware (`server/middleware/apiKey.js`), implementing timing-safe key comparison via `crypto.timingSafeEqual` and per-consumer rate limiting.
* Engineered the upstream resilience client (`server/services/resilientFetch.js` and `partner.js`) for partner downtime, retries, and v1/v2 schema transformations.
* Wrote the OpenAPI 3.0.3 specification (`openapi.yaml`), set up Swagger UI and Redoc routes, and created automated test suites for security, versioning, and partner integration.

**Where Others Carried Me:**
* My teammate owned the frontend React user interface, styling components with Tailwind CSS, building calendar date pickers, and managing state for session booking.
* They also led initial partner discussions with Farmers-AgroConnect, clarifying agricultural consultation requirements while I focused on backend implementation.

I deduct 1.5 points because during the middle weeks I focused heavily on backend unit tests and delayed writing integration tests for the React frontend, leading to minor UI prop mismatches that my teammate had to debug independently.
