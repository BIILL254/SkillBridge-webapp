# Deprecation Notice: SkillBridge Experts API v1

**To:** Farmers-AgroConnect (Team 6)  
**From:** SkillBridge (Team 5)  
**Date:** 2026-11-09  

---

## Summary
v1 of `GET /api/experts` (and the `/experts` alias) is deprecated. **v2 is live now.**  
v1 will stop working on **Fri, 20 Nov 2026 00:00:00 GMT**. Please migrate your integration before then.

---

## What Is Changing
* **The list is wrapped in an object:** `[ ... ]` becomes `{ "data": [ ... ], "count": N }`.
* **Field rename:** The field `"estate"` has been renamed to `"location"`.
* **Single expert lookup:** `GET /api/v2/experts/:id` now returns `{ "data": { ... } }`.
* **What stays identical:** All IDs, mentor names, ratings, bio descriptions, skills arrays, authentication keys (`X-API-Key`), and query filters (`?location=` and `?estate=` both work).

---

## Why
Wrapping the bare array in a `{ data, count }` response envelope allows SkillBridge to support pagination (page numbers, limit, total records) and cursor-based navigation without needing another breaking change in the future. Renaming `estate` to `location` standardizes campus and county location naming.

---

## Before and After

### v1: `GET /api/experts` (or `/experts`)
```json
[
  {
    "id": 13,
    "name": "Amina Farah",
    "estate": "Ruiru, Kiambu",
    "rating": 4.9,
    "latitude": -1.1466,
    "longitude": 36.9615,
    "bio": "Agriculture mentor offering Agronomy, Crop Disease Management, Irrigation Systems.",
    "skills": ["Agronomy", "Crop Disease Management", "Irrigation Systems", "Soil Health"]
  }
]
```

### v2: `GET /api/v2/experts` (or `/v2/experts`)
```json
{
  "data": [
    {
      "id": 13,
      "name": "Amina Farah",
      "location": "Ruiru, Kiambu",
      "rating": 4.9,
      "latitude": -1.1466,
      "longitude": 36.9615,
      "bio": "Agriculture mentor offering Agronomy, Crop Disease Management, Irrigation Systems.",
      "skills": ["Agronomy", "Crop Disease Management", "Irrigation Systems", "Soil Health"]
    }
  ],
  "count": 1
}
```

---

## How to Migrate
1. **Update Endpoint URL:** Change your request URL from `/api/experts` to `/api/v2/experts`. Use your existing `X-API-Key`.
2. **Read the Array from `.data`:** Replace `response.data` with `response.data.data` (or destructure `{ data, count } = response.data`).
3. **Read `.location`:** Update any frontend or model property that reads `expert.estate` to read `expert.location`.
4. **Verify:** Test the call in your development environment, then ping us so we can verify your caller label appears on `/api/v2/experts` in our `/api/stats` log.

---

## Timeline
* **Today (2026-11-09):** v2 is live now. v1 continues to serve requests. Every v1 response carries `Deprecation: true`, `Sunset: Fri, 20 Nov 2026 00:00:00 GMT` and a `Link` header with the matching v2 URL (for example `/api/v1/experts/13` points to `/api/v2/experts/13`).
* **Fri, 20 Nov 2026 00:00:00 GMT:** Sunset date. v1 will be turned off and return `410 Gone`, with the successor in the body:

```json
{ "error": "This API version has been retired", "sunset": "Fri, 20 Nov 2026 00:00:00 GMT", "successor": "/api/v2/experts/13" }
```

If you cannot move by then, tell us before the date and we can move it.

---

## Questions
Message Rick Kyalo (API Lead, SkillBridge) any time, in the class group chat or directly. We will reply within 24 hours. If something in v2 behaves differently from this notice, send the request you made, the response you got and the time, and we will check our log.
