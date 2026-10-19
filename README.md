# SkillBridge

SkillBridge is a full-stack **React + Node.js** platform that connects students to share skills, book learning sessions, and manage skill-exchange requests. Within our three-team university API ring, SkillBridge **provides** an expert directory, availability scheduling, and consultation booking API to **Farmers-AgroConnect**, and **consumes** vendor/logistics data from **Maji Website**.

Built with **React 18**, **Express 4**, and **SQLite (better-sqlite3)**.

---

## Quickstart — Make a Real API Call in 10 Seconds

Pick your terminal and run this single command against a running instance to get a real JSON response immediately:

```bash
curl -H "Authorization: Bearer test-token" http://localhost:3001/api/experts
```

> **Windows PowerShell:** `curl` is an alias for a different command there and shows a security prompt (or rejects `-H`). Type `curl.exe` instead of `curl` in every example in this README.

> **Note:** The `Authorization: Bearer <token>` header is a Week 8 placeholder (real token authentication arrives in Week 9). Public downstream endpoints also accept open requests without the header:
> ```bash
> curl http://localhost:3001/api/experts
> ```

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

### 3. Start the API server
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

### 4. (Optional) Start the frontend
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
2. **Interactive Swagger UI ("Try It Out"):** Open [`docs/swagger.html`](docs/swagger.html) in your browser for an interactive testing sandbox.
3. **Live Server Documentation:** When the Express server is running, navigate directly to:
   * Redoc Documentation: [http://localhost:3001/docs](http://localhost:3001/docs)
   * Raw OpenAPI Spec: [http://localhost:3001/openapi.yaml](http://localhost:3001/openapi.yaml)

To rebuild the docs from `openapi.yaml` at any time:
```bash
npm run docs:build
```

---

## Authentication Instructions

* **Downstream Partner Endpoints (`/api/experts`, `/api/skills`, `/api/requests`):**
  These endpoints serve our downstream partner **Farmers-AgroConnect**. In accordance with Week 8 lab specifications, authentication uses an open placeholder. Pass:
  ```http
  Authorization: Bearer <token>
  ```
  Where `<token>` can be any placeholder string (e.g., `test-token` or `agri-bearer-123`). Requests without the header are also accepted. Full OAuth/JWT arrives in Week 9.

* **Internal Student & Logistics Proxy Endpoints (`/api/logistics`, `/api/profile`, `/api/admin`):**
  Protected endpoints require a session token generated via login:
  ```bash
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"billamani","password":"1234"}'
  ```
  On Windows PowerShell (quotes inside JSON are stripped when passed to `curl.exe`), use this instead:
  ```powershell
  Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method Post -ContentType "application/json" -Body '{"username":"billamani","password":"1234"}'
  ```
  Returns (the `token` is a different random string every time, so copy yours):
  ```json
  {
    "token": "<your token: a long random string>",
    "user": { "id": 1, "name": "Bill Amani", "username": "billamani", "role": "user", "mustChangePassword": true }
  }
  ```
  Pass the returned token in subsequent requests, replacing `<token>` with your own:
  ```http
  Authorization: Bearer <token>
  ```

---

## Working Examples per Major Endpoint

Every example below includes the real copy-paste request and the real JSON response returned by the live server.

### 1. List Verified Experts (Filter & Sort)
Returns a list of verified mentors. Supports filtering by `estate` and sorting by `rating` or `proximity`.

* **Request:**
  ```bash
  curl -s "http://localhost:3001/api/experts?estate=Westlands"
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
  curl -s http://localhost:3001/api/experts/13
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
      "Soil Health"
    ]
  }
  ```

---

### 3. Get Expert Availability
Returns upcoming available time slots for scheduling a consultation.

* **Request:**
  ```bash
  curl -s http://localhost:3001/api/experts/13/availability
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
  curl -s http://localhost:3001/api/experts/13/reviews
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
  curl -s "http://localhost:3001/api/skills?tag=Agriculture"
  ```
* **Real Response (`200 OK`):**
  ```json
  [
    {
      "id": 68,
      "name": "Agronomy",
      "category": "Agriculture",
      "offeredBy": 1
    },
    {
      "id": 71,
      "name": "Crop Disease Management",
      "category": "Agriculture",
      "offeredBy": 1
    },
    {
      "id": 75,
      "name": "Farm Tech",
      "category": "Agriculture",
      "offeredBy": 1
    },
    {
      "id": 70,
      "name": "Irrigation Systems",
      "category": "Agriculture",
      "offeredBy": 1
    },
    {
      "id": 76,
      "name": "Livestock Management",
      "category": "Agriculture",
      "offeredBy": 1
    },
    {
      "id": 77,
      "name": "Organic Farming",
      "category": "Agriculture",
      "offeredBy": 1
    },
    {
      "id": 69,
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
  Invoke-RestMethod -Uri http://localhost:3001/api/requests -Method Post -ContentType "application/json" -Body '{"farmerName":"John Kamau","topic":"Irrigation Systems","expertId":13,"date":"2026-10-15T10:00:00Z"}'
  ```
* **Real Response (`201 Created`):**
  ```json
  {
    "requestId": 5,
    "status": "Pending"
  }
  ```

---

### 7. Discover Vendor Water Stations (Maji Logistics Proxy)
Proxies upstream water station availability from Maji Website. (Requires logged-in session token).

* **Request:**
  ```bash
  curl -s "http://localhost:3001/api/logistics/stations?estate=Kileleshwa" \
    -H "Authorization: Bearer <token>"
  ```
* **Real Response (`200 OK`):**
  ```json
  {
    "source": "mock",
    "stations": [
      {
        "vendorId": "vnd_kileleshwa_1",
        "stationName": "Kileleshwa Water Hub",
        "targetEstateId": "est_kileleshwa"
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

### 5. Missing Authentication on Protected Routes (`401 Unauthorized`)
* **Trigger:** Calling `/api/logistics/stations` without an `Authorization: Bearer <token>` header.
* **Request:** `GET /api/logistics/stations`
* **Response (`401 Unauthorized`):**
  ```json
  {
    "error": "Not logged in"
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

SkillBridge includes 272 automated tests across 10 test suites covering route validation, error status codes, authentication, SQLite migrations, and upstream contract mocking.

Run the entire test suite:
```bash
npm test
```

Expected output:
```text
Test Suites: 10 passed, 10 total
Tests:       272 passed, 272 total
Snapshots:   0 total
Time:        4.415 s
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
| **Testing** | Jest + Supertest (10 suites, 272 tests) |
| **Auth** | bcryptjs password hashing + opaque Bearer session tokens |

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
│   ├── middleware/           # auth.js, requireAdmin
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
├── __tests__/                # 10 test suites (272 tests)
├── openapi.yaml              # OpenAPI 3.0 contract
├── BLIND_TEST_REPORT.md      # Week 8 Blind Swap & Testing Report
├── package.json
└── README.md
```

---

## License

This project is developed for educational purposes as part of a university software engineering curriculum.
