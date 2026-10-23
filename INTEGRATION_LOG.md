# Week 10 Integration Log

**Team:** SkillBridge (Peer-Learning & Expert Discovery Platform)  
**API Ring:** Ring 3 (Consumer from Maji Website, Provider to Farmers-AgroConnect)  
**Deliverable:** Week 10 Lab — Calling Your Partner's Live API  
**Date:** Week 10 Lab Session  
**Upstream Partner URL:** `https://maji-api-onrender-com.onrender.com`  

---

## 1. Context & Setup (Part A)

- **Upstream Partner:** Team 4 (Maji Website — Water Ordering & Vendor Distribution Platform)
- **Downstream Partner:** Team 11 (Farmers-AgroConnect — Agricultural Consultation Platform)
- **Channel:** Live sync in lab session & shared API endpoints
- **Upstream Base URL:** `https://maji-api-onrender-com.onrender.com`
- **Authentication:** No API key required for Maji's active endpoints; optional `MAJI_API_KEY` supported in `.env` if required later.

---

## 2. First Call Outside the App (Part B)

Prior to modifying application code, we validated connectivity directly against Maji Website's live service using the terminal:

```bash
curl.exe -i https://maji-api-onrender-com.onrender.com/api/orders/active/estates
```

### Response Received:
```http
HTTP/1.1 200 OK
Date: Fri, 23 Oct 2026 05:53:22 GMT
Content-Type: application/json; charset=utf-8
Transfer-Encoding: chunked
Connection: close
access-control-allow-origin: http://localhost:5173
server: cloudflare
x-powered-by: Express
x-render-origin-server: Render
```

```json
[
  {"estate":"Lang'ata"},
  {"estate":"South C"},
  {"estate":"Westlands"},
  {"estate":"Karen"},
  {"estate":"Eastleigh"},
  {"estate":"Ngong"},
  {"estate":"Thika Road"},
  {"estate":"Buruburu"},
  {"estate":"Kileleshwa"},
  {"estate":"Lavington"},
  {"estate":"Kawangware"},
  {"estate":"Dagoretti"},
  {"estate":"Syokimau"},
  {"estate":"Kitengela"},
  {"estate":"Githurai"},
  {"estate":"Kangemi"},
  {"estate":"Parklands"},
  {"estate":"Eldoret (Nairobi Area)"},
  {"estate":"Ruiru"},
  {"estate":"Kasarani"},
  {"estate":"South B"},
  {"estate":"Embakasi"},
  {"estate":"Tena"}
]
```

**Status:** `200 OK` — 23 active estates returned.

---

## 3. Integration Bugs, Surprises, and Contract Deviations Table

| # | What broke (symptom) | Root cause | Fix | Whose code, and who fixed it |
|---|---|---|---|---|
| **1** | Windows PowerShell error when running `curl -i` | In Windows PowerShell 5.1, `curl` is an alias for `Invoke-WebRequest`, which does not accept `-i` or Linux flags. | Used `curl.exe` (native binary) or `Invoke-RestMethod` in PowerShell commands and documented it in README. | Tooling/Environment, fixed by SkillBridge |
| **2** | Calling `/estates` or `/api/estates` returned `404 Not Found` | Maji's OpenAPI contract (`MAJI_OPENAPI_RECEIVED.yaml`) specified `GET /estates`, but their deployed Express API exposed `GET /api/orders/active/estates`. | Updated `server/services/majiClient.js` to query `/api/orders/active/estates` first with automatic fallback to `/estates`. | Partner contract drift, fixed in SkillBridge adapter |
| **3** | UI displayed blank estate names (`undefined`) | Contract specified objects with `{ id, name, deliveryStatus }`, but partner API returns `{ "estate": "..." }` without `id` or `name` properties. | Added `normalizeEstates()` helper in `majiClient.js` that maps `item.estate` to `item.name`, generates a stable ID, and sets `deliveryStatus: "active"`. | Partner contract drift, fixed in SkillBridge adapter |
| **4** | Station endpoint `GET /vendors/stations` returns `404 Not Found` | Maji Website has deployed orders and active estates, but has not yet implemented the vendor pickup stations route on their live server. | In `getStations()`, caught upstream 404 and returned `{ source: "live", stations: [], notice: "..." }` so the schedule page continues functioning gracefully without failing. | Partner incomplete route, handled gracefully by SkillBridge |
| **5** | Simulated partner server offline (Part D failure test) | Pointed `MAJI_API_BASE_URL` to an invalid address (`http://localhost:59999`). Node threw `ECONNREFUSED`. | Added try/catch with 10s timeout in `callMaji()`, logging cause code (`ECONNREFUSED`), returning HTTP 502 with structured error JSON, and rendered a clean amber warning banner in `LogisticsCard.jsx` without crashing the page. | SkillBridge Part D resilience, implemented by SkillBridge |

---

## 4. Graceful Degradation Test (Part D)

We simulated partner failure to ensure the app complies with Part D ("survive your partner's API being unavailable without crashing or showing a blank page"):

1. Set `MAJI_API_BASE_URL=http://localhost:59999` in `.env`.
2. Reloaded the frontend `/schedule` page.
3. **Frontend Result:** The Schedule page loaded completely. Under "Water & Logistics", a friendly warning banner appeared:
   > *"⚠️ Maji Website Service Unavailable: The upstream water logistics partner could not be reached (ECONNREFUSED). Physical study sessions will default to campus meeting points until partner connection recovers."*
4. **Backend Terminal Output:**
   ```text
   [majiClient] Call to /api/orders/active/estates failed: ECONNREFUSED
   ```
5. Restored `MAJI_API_BASE_URL=https://maji-api-onrender-com.onrender.com` &rarr; live data restored automatically with zero code changes.

---

## 5. Downstream Partner Support (Part E)

While integrating upstream with Maji Website, we verified that SkillBridge continues serving Farmers-AgroConnect seamlessly:

- `GET /api/experts` &rarr; Returns verified expert mentors with rating, review count, and skills.
- `GET /api/experts/:id/availability` &rarr; Returns real-time calendar availability slots.
- `GET /api/skills/categories` &rarr; Returns skills categorized for downstream farmer filters.
- All downstream routes verified clean with zero 401/404/429 errors.

---

## 6. Live Demo Script (Part F)

- **Step 1 (Live Data):** Open `http://localhost:5173/schedule`. Point out the `"Live · Maji Website"` badge with green pulse indicator and show the 23 verified active Nairobi delivery zones fetched in real time from Maji.
- **Step 2 (Partner Down):** Stop Maji connection (point `MAJI_API_BASE_URL` to an unreachable port or unmount). Reload Schedule page. Demonstrate that the app remains running, calendar and sessions load normally, and a friendly offline fallback banner is displayed.
- **Step 3 (Partner Restored):** Restore the live Maji URL. Reload the page. Demonstrate that live data instantly recovers.
