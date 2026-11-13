# Individual Retrospective Report: SkillBridge

**Course:** Internet Application Programming  
**Author:** Bill Amani  
**Project:** SkillBridge (Team 5 — Peer-Learning & Expert Discovery Platform)  
**API Ring:** Ring 3 (Upstream: Team 4 — Maji Website | Downstream: Team 6 — Farmers-AgroConnect)

---

## 1. The Hardest Part of the Lifecycle

Across the fourteen weeks, the hardest stage was **Integration and Resilience (Weeks 10 and 11)**. Before Week 10, our mental model assumed that HTTP requests were deterministic: send a valid request to a route and receive a timely JSON response. The moment our application relied on an external partner hosted on Render's free tier, that assumption dissolved.

The difficulty was engineering for third-party unpredictability. When we first fetched vendor and estate data from Team 4 (Maji Website), their free cloud instances could be asleep, causing cold-start delays that triggered timeouts in Node.js. Maji's live endpoints and response fields also differed from the early design contract; the vendor locations response, for example, used `businessName` and `estate` rather than `name` and `deliveryStatus`.

To solve this, we redesigned our fetching pipeline. We built `resilientFetch.js` with a configurable timeout, bounded retries, and an in-memory `savedCopies` fallback cache in `majiClient.js`. Making the user interface acknowledge when live partner data was down—displaying an amber banner with the timestamp of saved data rather than showing an unhandled 502 or crashing—forced us to learn how production systems must handle failure.

---

## 2. One Real Cross-Team Issue

One cross-team issue occurred on **October 23, 2026**, while connecting SkillBridge to Maji's estate endpoint. Our saved Week 4 contract described `GET /estates`, but the deployed path we first tried returned `404 Not Found`. The deployed API exposed `GET /api/orders/active/estates` instead, and its response used `{ "estate": "..." }` rather than the contract's `{ id, name, deliveryStatus }` shape.

The integration log records the deployed path and the field mismatch. I worked on the API integration in the `7f41ab6` commit that day. `majiClient.js` normalizes Maji's `estate` field into SkillBridge's estate model. The repository does not record how long this diagnosis took, so I cannot give a reliable duration.

---

## 3. What I Would Design Differently

If starting SkillBridge over, I would change two architectural decisions:

First, **I would establish a standardized response and error envelope in Week 3 before writing routes.** Our API includes bare arrays and nested objects, while upstream partners can change their response shapes. Our error schema also changed as the project grew. Agreeing on consistent conventions early would have made partner adapters and client updates easier.

Second, **I would define version ownership and migration evidence earlier.** Our Week 13 `VERSIONING_NOTES.md` and `d476978` concern SkillBridge's own expert API changing from v1 to v2 for downstream Farmers-AgroConnect. That is separate from Maji's upstream changes: their vendor-locations API moved to `/api/v2/vendors/locations` with a 20 November 2026 sunset, and their active-estates API moved to `/api/v2/orders/active/estates` with a 13 November 2026 sunset. We should track each partner, endpoint, response shape, and sunset separately. The estates migration is implemented locally, but live verification is not recorded yet.

What I would keep is our **OpenAPI-first workflow** and contract-focused tests. The team brief records 471 of 471 tests passing across 16 suites for Demo Day on 10 November; my `ac1b694` commit is evidence of API test work.

---

## 4. My Contribution

I rate my overall contribution to SkillBridge as **8.5 out of 10**.

**What I Owned:**

- Designed the Express REST architecture (`server/app.js`, `server/db.js`), database migrations, and seeded 14 verified expert mentors.
- Built the security middleware (`server/middleware/apiKey.js`), implementing timing-safe key comparison via `crypto.timingSafeEqual` and per-consumer rate limiting.
- Engineered the upstream resilience client (`server/services/resilientFetch.js`, `server/services/majiClient.js`, and `partner.js`) for partner downtime, retries, and upstream response normalization.
- Wrote the OpenAPI 3.0.3 specification (`openapi.yaml`), set up Swagger UI and Redoc routes, and created automated test suites for security, versioning, and partner integration.

**Where Others Carried Me:**

- My teammate owned the frontend React user interface, styling components with Tailwind CSS, building calendar date pickers, and managing state for session booking.
- They also led initial partner discussions with Farmers-AgroConnect, clarifying agricultural consultation requirements while I focused on backend implementation.

I deduct 1.5 points because during the middle weeks I focused heavily on backend unit tests and delayed writing integration tests for the React frontend, leading to minor UI prop mismatches that my teammate had to debug independently.

### Commit evidence under my Git author

These selected commits under my Git author show work from the project's early planning through final delivery; commit counts alone do not measure contribution.

| Commit    | Date   | Evidence                                                           |
| --------- | ------ | ------------------------------------------------------------------ |
| `fd6fe60` | 21 Aug | Established core project documentation and database schema.        |
| `16f354f` | 24 Aug | Planned the project APIs.                                          |
| `baa5f1e` | 31 Aug | Prepared the Week 3 endpoint list and peer-review revisions.       |
| `b04a4d7` | 11 Sep | Initialized the SQLite schema, migrations, and seed data.          |
| `049316e` | 12 Oct | Published Week 8 documentation, README quickstart, and blind test. |
| `7f41ab6` | 23 Oct | Integrated with the partner APIs.                                  |
| `ac1b694` | 23 Oct | Added API tests.                                                   |
| `fee6531` | 29 Oct | Initial blind test and Maji integration.                           |
| `c975ce1` | 1 Nov  | Added timeout, retry, and graceful fallback behavior.              |
| `a89c812` | 2 Nov  | Improved Maji API integration.                                     |
| `710f874` | 2 Nov  | Added request logs and API metrics.                                |
| `d476978` | 9 Nov  | Implemented SkillBridge's v1-to-v2 versioning work.                |

### Related integration work by Rick

| Commit    | Date   | Message                                                                                           |
| --------- | ------ | ------------------------------------------------------------------------------------------------- |
| `7e23b87` | 20 Aug | SQLite database and updated README                                                                |
| `15a4788` | 5 Sep  | Add server-side validation, error handling, stop tracking db files                                |
| `b84e3a8` | 7 Sep  | Add downstream API for AgroConnect and upstream Maji Website integration, with agriculture skills |
