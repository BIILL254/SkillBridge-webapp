# SkillBridge

SkillBridge is a full-stack **React + Node.js** platform that connects students to share skills, book learning sessions, and manage skill-exchange requests. Within our three-team university API ring, SkillBridge **provides** an expert directory, availability scheduling, and consultation booking API to **Farmers-AgroConnect**, and **consumes** vendor/logistics data from **Maji Website**.

Built with **React 18**, **Express 4**, and **SQLite (better-sqlite3)**.

---

Site link- https://skillbridge-web-020v.onrender.com
API link- https://skillbridge-api-p6s9.onrender.com

## Quickstart — Make a Real API Call in 10 Seconds

Every request needs an API key in an `X-API-Key` header (see [Authentication](#authentication-and-rate-limiting)). With the API running and your key in hand, this one command returns real JSON:

```bash
curl -H "X-API-Key: <your-api-key>" http://localhost:3001/api/experts
```

* **Ring partners (Farmers-AgroConnect):** your key is sent to you privately. Replace `<your-api-key>` with it.
* **Running it yourself:** you create your own key in step 3 below.
* **No key, or a wrong one:** you get `401` (see [Error Format Reference](#error-format-reference)).

> **Windows PowerShell:** `curl` is an alias for a different command there and shows a security prompt (or rejects `-H`). Type `curl.exe` instead of `curl` in every example in this README.

---

## How to Run the API Locally (Clean Clone from Zero)

Follow these exact steps from a freshly cloned terminal.

> **Requires Node.js 20 or 22 (LTS).** Node 24 currently fails at `npm install` with `No prebuilt binaries found` for `better-sqlite3` (it then tries to compile from source and asks for Visual Studio C++ tools). If you see that error, install Node 22 and run `npm install` again.

### 1. Clone the repository
```bash
git clone https://github.com/BIILL254/SkillBridge-webapp.git
cd SkillBridge-webapp
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create your API keys and `.env` file
The API refuses every request that has no valid key, and keys live in a `.env` file that is **never committed** (it is listed in `.gitignore`). Copy the template, then fill it in:

```bash
cp .env.example .env
```
(Windows PowerShell: `Copy-Item .env.example .env`)

Generate a random key for each consumer, running this once per key:
```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

Put them in `.env` (the values below are placeholders, not real keys):
```text
API_KEYS=agroconnect:<key-1>,team:<key-2>
WEB_API_KEY=<key-3>
VITE_API_KEY=<same value as WEB_API_KEY>
```
* `API_KEYS` holds one key per outside consumer, written `name:key` and separated by commas. Give each partner their own key, privately.
* `WEB_API_KEY` is the key our own React app sends; `VITE_API_KEY` must hold the same value so the frontend can read it.
* If `API_KEYS` and `WEB_API_KEY` are both empty, the API rejects every request.

### 4. Start the API server
Run any of the following standard commands (they all work):
```bash
npm start
# or: npm run server
# or: node server.js
```
The server will start on port `3001`:
```text
SkillBridge API running at http://localhost:3001
```

* Zero external database setup is required — SQLite (`skillbridge.db`) initializes, creates all tables, and seeds 14 verified mentors, categorized skills, and default accounts automatically on first start.
* To reset the database to a clean, newly seeded state at any time:
  ```bash
  npm run db:reset
  ```

### 5. (Optional) Start the frontend
Open a second terminal window:
```bash
npm run dev
```
* **Frontend UI:** `http://localhost:5173`
* **Backend API:** `http://localhost:3001`

---

## Interactive Documentation Sites

This repository provides rendered browsable API documentation directly from `openapi.yaml`:

1. **Standalone Redoc Documentation:** Open [`docs/index.html`](docs/index.html) directly in any browser (no server needed — double-click the file or open via `file://`).
2. **Interactive Swagger UI ("Try It Out"):** Open [`docs/swagger.html`](docs/swagger.html) in your browser for an interactive testing sandbox. Click **Authorize** and paste your API key first, or every "Try it out" call returns 401.
3. **Live Server Documentation:** When the Express server is running, navigate directly to:
   * Redoc Documentation: [http://localhost:3001/docs](http://localhost:3001/docs)
   * Raw OpenAPI Spec: [http://localhost:3001/openapi.yaml](http://localhost:3001/openapi.yaml)

To rebuild the docs from `openapi.yaml` at any time:
```bash
npm run docs:build
```

---

## Authentication and Rate Limiting

SkillBridge checks two different things, and they answer different questions:

| Layer | Header | Says | Needed for |
| :--- | :--- | :--- | :--- |
| **API key** | `X-API-Key: <your-api-key>` | *Which application* is calling | **Every** endpoint below, no exceptions |
| **Login token** | `Authorization: Bearer <token>` | *Which student* is acting | Endpoints about a person (`/api/profile`, `/api/sessions`, `/api/admin`, `/api/logistics`, most of `/api/requests`) |

Only these are open without a key: `GET /api/health`, and the published documentation pages (`/docs`, `/api-docs`, `/openapi.yaml`). They return no data.

### A valid request
```bash
curl -H "X-API-Key: <your-api-key>" http://localhost:3001/api/experts
```
PowerShell:
```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/experts -Headers @{ "X-API-Key" = "<your-api-key>" }
```
Always use the placeholder `<your-api-key>` in anything you share; never paste a real key into a README, chat channel, or repository.

### Getting a login token (for the student endpoints)
The login call needs the API key too:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "X-API-Key: <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"username":"billamani","password":"1234"}'
```
On Windows PowerShell (quotes inside JSON are stripped when passed to `curl.exe`), use this instead:
```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method Post -Headers @{ "X-API-Key" = "<your-api-key>" } -ContentType "application/json" -Body '{"username":"billamani","password":"1234"}'
```
Returns (the `token` is a different random string every time, so copy yours):
```json
{
  "token": "<your token: a long random string>",
  "user": { "id": 1, "name": "Bill Amani", "username": "billamani", "role": "user", "mustChangePassword": true }
}
```
Send both headers on later calls, replacing `<token>` with your own:
```http
X-API-Key: <your-api-key>
Authorization: Bearer <token>
```

### What a 401 looks like (missing or wrong key)
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json
```
```json
{ "error": "Missing or invalid API key" }
```
A wrong key and a missing key get the same answer on purpose. The request never reaches the endpoint. (A valid key with a missing or expired login token on a student endpoint also returns `401`, with `{"error": "Not logged in"}`.)

### Rate limit
Each key may make **100 requests per minute**. Going over returns `429`, and the counter resets when the minute ends:
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 37
Content-Type: application/json
```
```json
{ "error": "Too many requests", "retryAfter": 37 }
```
`Retry-After` (and `retryAfter`) is the number of seconds to wait before trying again. Every response also carries `X-RateLimit-Limit` and `X-RateLimit-Remaining` so you can slow down before hitting the limit. Our own web app is counted per visitor address instead of per key, at 300 requests per minute. Limits can be changed with `RATE_LIMIT_MAX`, `RATE_LIMIT_WEB_MAX` and `RATE_LIMIT_WINDOW_MS` (see `.env.example`).

---

## Working Examples per Major Endpoint

Every example below includes the real copy-paste request and the real JSON response returned by the live server. Replace `<your-api-key>` with your own key (and `<token>` with your own login token where shown).

### 1. List Verified Experts (Filter & Sort)
Returns a list of verified mentors. Supports filtering by `estate` and sorting by `rating` or `proximity`.

* **Request:**
  ```bash
  curl -s -H "X-API-Key: <your-api-key>" "http://localhost:3001/api/experts?estate=Westlands"
  ```
* **Real Response (`200 OK`):**
  ```json
  [
    {
      "id": 4,
      "name": "K.Dot",
      "estate": "Westlands, Nairobi",
      "rating": 4.7,
      "latitude": -1.2676,
      "longitude": 36.8108,
      "bio": "Music & Arts mentor offering Content Creation, Music Production, Songwriting.",
      "skills": [
        "Content Creation",
        "Music Production",
        "Songwriting"
      ]
    }
  ]
  ```

---

### 2. Get Expert Profile by ID
Returns detailed profile attributes for a specific expert.

* **Request:**
  ```bash
  curl -s -H "X-API-Key: <your-api-key>" http://localhost:3001/api/experts/13
  ```
* **Real Response (`200 OK`):**
  ```json
  {
    "id": 13,
    "name": "Amina Farah",
    "estate": "Ruiru, Kiambu",
    "rating": 4.9,
    "latitude": -1.1466,
    "longitude": 36.9615,
    "bio": "Agriculture mentor offering Agronomy, Crop Disease Management, Irrigation Systems.",
    "skills": [
      "Agronomy",
      "Crop Disease Management",
      "Irrigation Systems",
      "Soil Health",
      "Water Treatment"
    ]
  }
  ```

---

### 3. Get Expert Availability
Returns upcoming available time slots for scheduling a consultation.

* **Request:**
  ```bash
  curl -s -H "X-API-Key: <your-api-key>" http://localhost:3001/api/experts/13/availability
  ```
* **Real Response (`200 OK`):**
  ```json
  [
    {
      "date": "2026-10-13",
      "startTime": "09:00:00",
      "durationMinutes": 60
    },
    {
      "date": "2026-10-13",
      "startTime": "11:00:00",
      "durationMinutes": 60
    },
    {
      "date": "2026-10-13",
      "startTime": "14:00:00",
      "durationMinutes": 60
    }
  ]
  ```

---

### 4. Get Expert Reviews Summary
Returns aggregate ratings, review count, and total completed sessions for an expert.

* **Request:**
  ```bash
  curl -s -H "X-API-Key: <your-api-key>" http://localhost:3001/api/experts/13/reviews
  ```
* **Real Response (`200 OK`):**
  ```json
  {
    "rating": 4.9,
    "reviewCount": 18,
    "completedSessions": 9
  }
  ```

---

### 5. Browse Categorized Skills
Returns categorized skills available on the platform, filterable by `tag`.

* **Request:**
  ```bash
  curl -s -H "X-API-Key: <your-api-key>" "http://localhost:3001/api/skills?tag=Agriculture"
  ```
* **Real Response (`200 OK`):**
  ```json
  [
    {
      "id": 71,
      "name": "Agronomy",
      "category": "Agriculture",
      "offeredBy": 1
    },
    {
      "id": 74,
      "name": "Crop Disease Management",
      "category": "Agriculture",
      "offeredBy": 1
    },
    {
      "id": 79,
      "name": "Farm Tech",
      "category": "Agriculture",
      "offeredBy": 1
    },
    {
      "id": 73,
      "name": "Irrigation Systems",
      "category": "Agriculture",
      "offeredBy": 1
    },
    {
      "id": 80,
      "name": "Livestock Management",
      "category": "Agriculture",
      "offeredBy": 1
    },
    {
      "id": 81,
      "name": "Organic Farming",
      "category": "Agriculture",
      "offeredBy": 1
    },
    {
      "id": 72,
      "name": "Soil Health",
      "category": "Agriculture",
      "offeredBy": 1
    }
  ]
  ```

---

### 6. Book a Consultation Request (Farmers-AgroConnect)
Allows a farmer to submit a consultation booking request for a verified expert.

* **Request (Bash / Linux / macOS):**
  ```bash
  curl -s -X POST http://localhost:3001/api/requests \
    -H "X-API-Key: <your-api-key>" \
    -H "Content-Type: application/json" \
    -d '{
      "farmerName": "John Kamau",
      "topic": "Irrigation Systems",
      "expertId": 13,
      "date": "2026-10-15T10:00:00Z"
    }'
  ```
* **Request (Windows PowerShell):**
  ```powershell
  Invoke-RestMethod -Uri http://localhost:3001/api/requests -Method Post -Headers @{ "X-API-Key" = "<your-api-key>" } -ContentType "application/json" -Body '{"farmerName":"John Kamau","topic":"Irrigation Systems","expertId":13,"date":"2026-10-15T10:00:00Z"}'
  ```
* **Real Response (`201 Created`):**
  ```json
  {
    "requestId": 4,
    "status": "Pending"
  }
  ```

---

### 7. Discover Water Vendors (Maji Logistics Proxy)
Proxies Maji Website's vendor locations (their `GET /api/vendors/locations`). (Requires logged-in session token.) The estate name must match Maji's spelling, for example `Kasarani` or `Lang'ata`; capital letters are ignored.

* **Request:**
  ```bash
  curl -s "http://localhost:3001/api/logistics/stations?estate=Kileleshwa" \
    -H "X-API-Key: <your-api-key>" \
    -H "Authorization: Bearer <token>"
  ```
* **Real Response (`200 OK`):**
  ```json
  {
    "source": "mock",
    "stations": [
      {
        "vendorId": 2,
        "businessName": "Kileleshwa Fresh Water",
        "estate": "Kileleshwa"
      }
    ]
  }
  ```

---

### 8. List Maji's Water Vendors (Maji Logistics Proxy)
Proxies Maji Website's `GET /api/vendors/all`: every water vendor, with rating and contact details. Optional `?estate=` (Maji's spelling, capitals ignored). Needs both the API key and a logged-in student token, because it includes phone numbers.

* **Request:**
  ```bash
  curl -s "http://localhost:3001/api/logistics/vendors/all?estate=Kasarani" \
    -H "X-API-Key: <your-api-key>" \
    -H "Authorization: Bearer <token>"
  ```
* **Response (`200 OK`)** (mock data shown; `source` is `live` when connected to Maji):
  ```json
  {
    "source": "mock",
    "vendors": [
      {
        "vendorId": 1,
        "businessName": "Chemchemi Fresh Water Co.",
        "estate": "Kasarani",
        "rating": 4.2,
        "isVerified": true,
        "isOnline": true,
        "ownerName": "Mock Owner One",
        "phone": "0700000001"
      }
    ]
  }
  ```

---

## Error Format Reference

All API errors return a consistent, unambiguous JSON payload with an `"error"` description message and the corresponding HTTP status code. Callers never need to guess failure reasons.

### 1. Resource Not Found (`404 Not Found`)
* **Trigger:** Calling an expert ID that does not exist.
* **Request:** `GET /api/experts/9999`
* **Response (`404 Not Found`):**
  ```json
  {
    "error": "Expert not found"
  }
  ```

### 2. Invalid Query Parameters (`400 Bad Request`)
* **Trigger:** Supplying an unsupported sort parameter.
* **Request:** `GET /api/experts?sort=alphabetical`
* **Response (`400 Bad Request`):**
  ```json
  {
    "error": "sort must be 'rating' or 'proximity'"
  }
  ```

### 3. Missing Required Request Body Fields (`400 Bad Request`)
* **Trigger:** Submitting a consultation booking missing `expertId` or `date`.
* **Request:** `POST /api/requests` with body `{"farmerName": "John Kamau"}`
* **Response (`400 Bad Request`):**
  ```json
  {
    "error": "farmerName, topic, expertId, and date are required"
  }
  ```

### 4. Invalid Foreign Key Reference (`404 Not Found`)
* **Trigger:** Booking a consultation for an expert ID that does not exist in the database.
* **Request:** `POST /api/requests` with `expertId: 9999`
* **Response (`404 Not Found`):**
  ```json
  {
    "error": "expertId does not match any SkillBridge expert"
  }
  ```

### 5. Missing or Wrong API Key (`401 Unauthorized`)
* **Trigger:** Any request with no `X-API-Key` header, or a key the server does not know.
* **Request:** `GET /api/experts` (no key)
* **Response (`401 Unauthorized`):**
  ```json
  {
    "error": "Missing or invalid API key"
  }
  ```

### 6. Missing Login on Student Routes (`401 Unauthorized`)
* **Trigger:** A valid API key, but calling `/api/logistics/stations` without an `Authorization: Bearer <token>` header.
* **Request:** `GET /api/logistics/stations` with only `X-API-Key`
* **Response (`401 Unauthorized`):**
  ```json
  {
    "error": "Not logged in"
  }
  ```

### 7. Rate Limit Exceeded (`429 Too Many Requests`)
* **Trigger:** More than 100 requests from one key inside one minute.
* **Response (`429 Too Many Requests`)** with header `Retry-After: <seconds>`:
  ```json
  {
    "error": "Too many requests",
    "retryAfter": 37
  }
  ```

### 8. Unexpected Server Error (`500 Internal Server Error`)
* **Trigger:** A bug or a database failure on our side. The details are logged on the server and never sent to you.
* **Response (`500 Internal Server Error`):**
  ```json
  {
    "error": "Something went wrong"
  }
  ```

---

## Seed Accounts & Login Credentials

All seeded accounts share the default password `1234` and are prompted to set a real password on first login via the web UI.

| Account Type | Username | Default Password | Role |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `1234` | Full administrative access & audit log |
| **Agricultural Mentor** | `aminafarah` | `1234` | Verified Agronomy & Soil Health expert |
| **Student (Bill Amani)** | `billamani` | `1234` | Regular student user |
| **Student (Jessica)** | `jessica` | `1234` | Design & UI/UX student |

---

## Automated Test Suite

SkillBridge includes 342 automated tests across 13 test suites covering route validation, error status codes, authentication, API key enforcement (401 / 200), rate limiting (429), the security audit regressions, SQLite migrations, and upstream contract mocking.

Run the entire test suite:
```bash
npm test
```

Expected output:
```text
Test Suites: 13 passed, 13 total
Tests:       342 passed, 342 total
Snapshots:   0 total
Time:        16 s
Ran all test suites.
```

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18 + Vite |
| **Backend** | Node.js + Express 4 |
| **Database** | SQLite via `better-sqlite3` (zero-config, local file `skillbridge.db`) |
| **Documentation** | OpenAPI 3.0.3, Redocly, Swagger UI |
| **Testing** | Jest + Supertest (13 suites, 342 tests) |
| **Auth** | Per-consumer API keys (`X-API-Key`) + bcryptjs password hashing + opaque Bearer session tokens |
| **Rate limiting** | In-memory fixed window per key (429 + `Retry-After`) |

---

## Project Structure

```text
SkillBridge-webapp-main/
│
├── docs/                     # Published documentation site
│   ├── index.html            # Pre-rendered standalone Redoc docs page
│   ├── swagger.html          # Interactive Swagger UI sandbox
│   └── openapi.json          # Bundled JSON spec
│
├── server/
│   ├── routes/               # API route handlers (experts, skills, requests, logistics, auth, admin)
│   ├── middleware/           # apiKey.js (key check + rate limit), auth.js (login), errorHandler.js
│   ├── services/             # majiClient.js (upstream Maji integration)
│   ├── app.js                # Express app setup and static docs mounting
│   ├── db.js                 # SQLite schema, migrations, and seed data
│   ├── reset-db.js           # Database reset script
│   └── server.js             # HTTP listener
│
├── src/                      # React frontend application
│   ├── components/           # Navbar, Calendar, Modals
│   ├── context/              # AuthContext
│   └── pages/                # Marketplace, ExpertProfile, AdminPage
│
├── __tests__/                # 13 test suites (342 tests)
├── openapi.yaml              # OpenAPI 3.0 contract
├── BLIND_TEST_REPORT.md      # Week 8 Blind Swap & Testing Report
├── SECURITY_AUDIT.md         # Week 9 security self-audit
├── package.json
└── README.md
```

---

## License

This project is developed for educational purposes as part of a university software engineering curriculum.
