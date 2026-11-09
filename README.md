# SkillBridge — Peer-Learning & Expert Discovery Platform

SkillBridge is a full-stack **React + Node.js (Express)** web application and REST API that connects university students to share skills, book mentorship sessions, and exchange knowledge.

Within our three-team university API ring:

- **Upstream:** Consumes water station logistics and vendor ratings from **Maji Website (Team 4)**.
- **Our Core:** Provides expert discovery, consultation scheduling, and a skill marketplace.
- **Downstream:** Provides verified expert discovery and agricultural consultation booking to **Farmers-AgroConnect (Team 11)**.

Built with **React 18**, **Express 4**, and **SQLite (`better-sqlite3`)**.

---

## ⚡ Quickstart — Run the Web App in 3 Steps

Follow these simple steps from a fresh clone to get both the frontend and backend running:

### 1. Install Dependencies

```bash
npm install
```

_(Requires Node.js 20 or 22 LTS)._

### 2. Configure Environment

Copy the example environment file:

```bash
# Linux / macOS:
cp .env.example .env

# Windows PowerShell:
Copy-Item .env.example .env
```

_(The pre-configured `.env.example` comes with working development keys out-of-the-box — no edits needed for local testing!)_

### 3. Launch the Application

You can run both the server and frontend together, or individually:

```bash
# Terminal 1 — Start the API Server (Port 3001):
npm start

# Terminal 2 — Start the React Frontend (Port 5173):
npm run dev
```

- **Frontend Web App:** [http://localhost:5173](http://localhost:5173)
- **Backend API & Health Check:** [http://localhost:3001/api/health](http://localhost:3001/api/health)
- **Interactive Swagger UI:** [http://localhost:3001/swagger](http://localhost:3001/swagger)
- **Redoc Documentation:** [http://localhost:3001/docs](http://localhost:3001/docs)

> **One-step start (macOS / Linux):** You can also run `./run.sh` to automatically copy `.env`, install missing packages, and boot the server.

---

## 👤 Demo Accounts & Login Credentials

The local SQLite database seeds 14 verified experts, categorized skills, and default accounts automatically on first start. All demo accounts use the default password `1234`:

| Role                    | Username     | Password | Purpose                                                           |
| :---------------------- | :----------- | :------- | :---------------------------------------------------------------- |
| **Student**             | `billamani`  | `1234`   | Standard student account (book mentors, request skill swaps)      |
| **Student**             | `jessica`    | `1234`   | Design & UI/UX student account                                    |
| **Agricultural Mentor** | `aminafarah` | `1234`   | Verified Agronomy & Soil Health mentor (consulted by farmers)     |
| **Admin**               | `admin`      | `1234`   | Platform administrator (manage users, verify experts, audit logs) |

---

## 🧭 How to Use the Web Application (New User Walkthrough)

Once the app is running at **[http://localhost:5173](http://localhost:5173)**:

### 1. Logging In

- Click **Login** in the top navigation bar.
- Enter username `billamani` and password `1234`.
- Upon logging in, your coin balance, active sessions, and profile are displayed.

### 2. Discovering Experts & Mentors

- Navigate to the **Experts** tab.
- Filter mentors by subject area (e.g., Computer Science, Business, Agriculture, Design) or search by estate/location (e.g., _Westlands_, _Ruiru_).
- Click on any expert card (such as **Amina Farah** or **K.Dot**) to inspect their full profile, bio, skills, and aggregate review ratings.

### 3. Booking a Mentorship Session

- On an expert's profile page, view their **Availability Calendar**.
- Select an open slot (e.g., 09:00 or 14:00).
- Enter the discussion topic and confirm.
- The booking immediately creates a confirmed session and deducts the session coins from your balance.

### 4. Exploring the Skills Marketplace & Peer Swaps

- Open the **Skills Marketplace** tab to view skills offered across the campus community.
- Search by tag (e.g., _Web Development_, _Agronomy_, _Public Speaking_).
- Click **Request Swap** to propose a skill-exchange session with a fellow student.

### 5. Water Vendors & Logistics (Maji Upstream Integration)

- Open the **Logistics & Water** section on your dashboard.
- SkillBridge communicates server-to-server with the upstream **Maji Website API** to display nearby water stations, vendor ratings, and delivery status.
- _Resilience in action:_ If Maji's server is unreachable or offline, SkillBridge seamlessly activates its cached fallback and shows a yellow banner: _"Showing saved data from [timestamp]. Live partner data currently unavailable."_

### 6. Admin Panel

- Log out and log in as `admin` (password `1234`).
- Navigate to `/admin` to view platform metrics, inspect user roles, approve new expert applications, and view audit events.

---

## 🔌 API Quickstart (For Developers & Partners)

Every API request requires an API key in the `X-API-Key` header.

### 1. Test a Live Read Request

In your terminal, run:

```bash
# Windows PowerShell: use curl.exe instead of curl
curl.exe -H "X-API-Key: web-local-dev-key-12345" http://localhost:3001/api/experts
```

Returns a `200 OK` JSON array of all 14 verified experts.

### 2. Missing Key Enforcement (`401 Unauthorized`)

```bash
curl.exe http://localhost:3001/api/experts
```

Response:

```json
{
  "error": "Missing or invalid API key"
}
```

### 3. Rate Limiting (`429 Too Many Requests`)

- Partner keys are rate-limited to **100 requests per minute**.
- Frontend browser requests are rate-limited to **300 requests per minute**.
- If exceeded, the server returns HTTP `429` with a `Retry-After: <seconds>` header.

---

## 📖 API Documentation & Contract

- **OpenAPI 3.0 Contract:** Located at [`openapi.yaml`](openapi.yaml) in the root directory.
- **Interactive Swagger UI:** Open [http://localhost:3001/swagger](http://localhost:3001/swagger) to test endpoints in your browser.
- **Redoc Specification:** Open [http://localhost:3001/docs](http://localhost:3001/docs) for clean, searchable reference documentation.

---

## 🧪 Running Automated Tests

SkillBridge includes **432 automated tests** across **15 test suites** verifying routes, database operations, security policies, rate limiting, and resilience fallbacks:

```bash
npm test
```

Expected output:

```text
Test Suites: 15 passed, 15 total
Tests:       432 passed, 432 total
Snapshots:   0 total
Status:      All tests passing (100%)
```

---

## 🔄 Resetting the Database

If you wish to reset the local SQLite database to a pristine seeded state at any time:

```bash
npm run db:reset
```

This safely drops and recreates `skillbridge.db` with fresh demo students, mentors, sessions, and categories.

---

## 🛠️ Tech Stack & Key Files

| Layer           | Technology                                     | Purpose                                                         |
| :-------------- | :--------------------------------------------- | :-------------------------------------------------------------- |
| **Frontend**    | React 18, Vite, Tailwind CSS                   | Responsive student web portal                                   |
| **Backend API** | Node.js, Express 4                             | RESTful API server with custom middleware                       |
| **Database**    | SQLite via `better-sqlite3`                    | Zero-configuration single-file database (`skillbridge.db`)      |
| **Security**    | Timing-safe key check, bcryptjs, opaque tokens | Protection against timing attacks & IDOR vulnerabilities        |
| **Resilience**  | `resilientFetch.js`                            | 1500ms timeout, 2 retries, exponential backoff, cached fallback |
| **Monitoring**  | `/api/stats` endpoint                          | Traffic metrics, error rates, and route latency profiling       |

---

## 📄 License

Developed for educational purposes as part of the Advanced Networking / Internet Application Programming course.
