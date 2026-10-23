# Upstream API Integration Guide — Maji Website (Week 10)

This document provides a complete technical guide to how **SkillBridge** integrates with upstream partner **Maji Website** (`https://maji-api-onrender-com.onrender.com`) for the **Week 10: Calling Your Partner's Live API** lab deliverable.

---

## 1. Integration Architecture

### The Backend Proxy Pattern (Zero Browser Leaks)
Following Lab 10 security standards, **SkillBridge never calls external partner APIs directly from the browser**. Calling external partners from client-side JavaScript would expose partner API keys and trigger CORS preflight failures.

Instead, SkillBridge uses a server-to-server proxy pattern:

```
[ Browser / React UI ]
        │  (Calls internal authenticated endpoint: GET /api/logistics/estates)
        ▼
[ SkillBridge Express Backend (Port 3001) ]
        │  (server/services/majiClient.js reads MAJI_API_BASE_URL from .env)
        ▼
[ Maji Website Live API (Render: https://maji-api-onrender-com.onrender.com) ]
```

---

## 2. Configuration (`.env` Setup)

Upstream connection credentials are kept in `.env` (which is strictly ignored by Git in `.gitignore`):

```bash
# In SkillBridge-webapp-main/.env

# Backend API URL for frontend Vite client
VITE_API_URL=http://localhost:3001/api

# Upstream Partner: Maji Website Live API
MAJI_API_BASE_URL=https://maji-api-onrender-com.onrender.com

# Optional: Partner API key if required
# MAJI_API_KEY=
```

### Mock Mode Fallback
If `MAJI_API_BASE_URL` is omitted or empty, SkillBridge automatically reverts to offline mock mode (`source: "mock"`), allowing tests and offline development to continue without internet access.

---

## 3. Endpoints & Contract Normalization

During live testing outside the app, we discovered that Maji Website's deployed API drifted from the original Week 4 OpenAPI contract (`src/documentation/MAJI_OPENAPI_RECEIVED.yaml`):

| Property | Contract Specification | Maji Deployed API | SkillBridge Adapter Handling |
| :--- | :--- | :--- | :--- |
| **Endpoint** | `GET /estates` | `GET /api/orders/active/estates` | `majiClient.js` queries `/api/orders/active/estates` with fallback to `/estates`. |
| **Response Item** | `{ id, name, deliveryStatus }` | `{ "estate": "Westlands" }` | `normalizeEstates()` maps `item.estate` &rarr; `item.name`, generates a stable ID, and sets `deliveryStatus: "active"`. |
| **Auth** | Bearer Token planned | Public / No Auth | Supported optionally; does not fail when absent. |
| **Stations** | `GET /vendors/stations` | `404 Not Found` | Handled gracefully: returns `{ source: "live", stations: [], notice: "..." }` without failing the request. |

### Normalization Logic (`server/services/majiClient.js`)
```javascript
function normalizeEstates(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList.map((item, idx) => {
    if (typeof item === "string") {
      return { id: `est_${idx + 1}`, name: item, deliveryStatus: "active" };
    }
    const name = item.name || item.estate || `Estate ${idx + 1}`;
    const id = item.id ? String(item.id) : `est_${idx + 1}`;
    const deliveryStatus = item.deliveryStatus || "active";
    return { id, name, deliveryStatus };
  });
}
```

---

## 4. Resilience & Graceful Error Handling (Part D)

To fulfill Lab 10 Part D, the application is designed to survive upstream outages gracefully:

1. **Timeout Protection:** External calls use `AbortSignal.timeout(10000)` to ensure a slow partner never causes SkillBridge requests to hang indefinitely.
2. **Error Isolation:** If Maji's server is unreachable (`ECONNREFUSED` / `ENOTFOUND` / 5xx), `callMaji()` catches the error, logs the diagnostic cause code without leaking credentials, and returns a structured `502 Bad Gateway`:
   ```json
   {
     "error": "Maji Website service unavailable: ECONNREFUSED"
   }
   ```
3. **UI Graceful Degradation:** The frontend component ([`src/components/LogisticsCard.jsx`](file:///c:/Users/bill7/Downloads/SkillBridge-webapp-updated/SkillBridge-webapp-main/src/components/LogisticsCard.jsx)) handles failures cleanly:
   - Does **not** crash or trigger an unhandled React error boundary.
   - Does **not** show a blank screen.
   - Renders an informative amber alert: *"⚠️ Maji Website Service Unavailable: Physical study sessions will default to campus meeting points until partner connection recovers."*

---

## 5. How to Run & Verify

### 1. Test Partner Connectivity in Terminal (Outside the App)
```powershell
# In PowerShell (use curl.exe to avoid Invoke-WebRequest alias bugs):
curl.exe -i https://maji-api-onrender-com.onrender.com/api/orders/active/estates

# Or using native PowerShell:
Invoke-RestMethod https://maji-api-onrender-com.onrender.com/api/orders/active/estates
```

### 2. Run the Automated Test Suite (Mock Mode Protected)
```bash
npm test
```
All 10 test suites (274 tests) run against the mock database and mock adapter, ensuring 100% passing tests without external network dependencies.

### 3. Start the Live Server & Frontend
```bash
# Terminal 1: Backend Express Server (Port 3001)
npm run server

# Terminal 2: Vite React Frontend (Port 5173)
npm run dev
```

### 4. Visit the Application
1. Open `http://localhost:5173` in your browser.
2. Navigate to the **Schedule** tab (`/schedule`).
3. Under the **Water & Logistics** card:
   - Notice the green pulsing indicator with the badge **"Live · Maji Website"**.
   - View the 23 verified active Nairobi delivery zones fetched in real time from Maji.

---

## 6. Live Demo Runbook (Lab 10 Demo Presentation)

| Step | Action | What to Demonstrate to Instructor / TA |
| :--- | :--- | :--- |
| **Step 1: Live Integration** | Load `http://localhost:5173/schedule` with valid `.env`. | Show the **"Live · Maji Website"** badge and the 23 live estates (Lang'ata, Westlands, Kileleshwa, etc.) dynamically fetched through your backend proxy. |
| **Step 2: Partner Outage (Part D)** | In `.env`, change `MAJI_API_BASE_URL` to `http://localhost:59999` and restart server (or disconnect). Refresh the page. | Show that SkillBridge **does not crash** and the calendar loads smoothly. Point to the amber alert banner stating that Maji Website is offline and meetings default to campus. Check server terminal for `ECONNREFUSED` log. |
| **Step 3: Recovery** | Restore `MAJI_API_BASE_URL=https://maji-api-onrender-com.onrender.com` in `.env` and restart server. Refresh the page. | Show that live connection instantly recovers and the estates re-appear. |
| **Step 4: Downstream Support (Part E)** | In browser or terminal, query `http://localhost:3001/api/experts` and `http://localhost:3001/api/skills/categories`. | Demonstrate that downstream endpoints for Farmers-AgroConnect are fully responsive, contract-compliant, and well-documented. |
