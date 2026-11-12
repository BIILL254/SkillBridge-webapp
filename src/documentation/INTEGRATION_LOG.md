# Week 10 Integration Log

**Team:** SkillBridge (Peer-Learning & Expert Discovery Platform)  
**API Ring:** Ring 3 (Consumer from Maji Website, Provider to Farmers-AgroConnect)  
**Deliverable:** Week 10 Lab — Calling Your Partner's Live API  
**Date:** Week 10 Lab Session  
**Upstream Partner URL:** `https://maji-api-onrender-com.onrender.com`  

---

## 1. Context & Setup (Part A)

- **Upstream Partner:** Team 4 (Maji Website — Water Ordering & Vendor Distribution Platform)
- **Downstream Partner:** Team 6 (Farmers-AgroConnect — Agricultural Consultation Platform)
- **Channel:** Live sync in lab session & shared API endpoints
- **Upstream Base URL:** `https://maji-api-onrender-com.onrender.com`
- **Authentication:** No API key was needed on Maji's early endpoints. From 29 Oct Maji requires one, set as `MAJI_API_KEY` in `.env` (see row 7 in section 3).

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
| **6** | Week 13: Deprecation notice received from Maji for `/api/vendors/locations` | Upstream partner upgraded to v2 (`/api/v2/vendors/locations`), wrapping arrays in `{ data, count }` and setting sunset date for 2026-11-20. | Created `server/services/partner.js` version adapter supporting both v1 and v2, selectable via `PARTNER_VERSION=v2` in `.env`. Validated with `partner.test.js`. Zero downtime or broken requests occurred because we were warned in advance. | Upstream partner contract evolution, cleanly handled in SkillBridge |
| **7** | 29 Oct: `GET /api/vendors/all` returned `404 Cannot GET /api/vendors/all` (about 01:30), then `401` once Maji switched API-key checking on (about 22:31) | 404: Maji had written the route but not pushed it to GitHub, so it was never deployed (they confirmed at 10:25). 401: their key check was live but the keys were not yet set in Maji's Render environment | Rick asked for the endpoint on 28 Oct (11:51; Maji offered the all-vendors list at 12:32), tested it and sent Maji a three-point bug report. Maji pushed the route and added the keys (about 23:37); it worked at 23:41 and returned 50+ vendors. About 36 hours from request to first success, about 1 h 10 min of it the 401. | Maji's code and deployment. Rick requested, tested and diagnosed it. Bill built the integration (`fee6531`, `c975ce1`, `a89c812`). |
| **8** | 12 Nov: Maji notice (Marie Mumbu, Team 4) that v1 of `GET /api/orders/active/estates` stops working on 13 Nov 2026. v2 (`/api/v2/orders/active/estates`) wraps the list as `{ data, count }`; the `estate` field, the key and the rate limit do not change. | The notice gave one day of warning and no time of day. Our client called only the v1 path, so after 13 Nov the estates and Schedule data would have come from the saved copy (or shown as unavailable). | Maji changed the response shape. Our `majiClient.js` now tries v2 first, then v1, then the Week 4 `/estates` contract, and reads both the bare array and the wrapped list (tests in `estates.test.js`). Still to do: confirm to Maji that we have moved so they can see our calls on the v2 URL. | Maji's change and notice. The client change is in the versioning migration commits. |

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

---

## 7. Week 13 Upstream Migration (Maji v2)

In Week 13, Maji Website sent a formal deprecation notice announcing the retirement of their unversioned vendor stations API in favor of `/api/v2/vendors/locations`.

- **Migration Implementation:** We encapsulated all upstream schema differences in `server/services/partner.js`.
- **Zero-Downtime Switch:** Changing `PARTNER_VERSION=v2` in `.env` immediately redirects client calls to the v2 endpoint, normalizes `{ data: [...], count }` into our standard internal model, and leaves all UI components untouched.
- **Automated Validation:** Verified with `npm test` via `__tests__/partner.test.js`, ensuring both v1 and v2 responses parse to identical UI-ready structures.

