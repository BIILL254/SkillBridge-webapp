# Versioning Notes — Week 13

**Team:** SkillBridge (Team 5)  
**Deliverable:** Week 13 Lab — Shipping a Breaking Change Without Breaking Everyone  
**Date:** 2026-11-09  

---

## 1. The Change in One Sentence
We wrapped the bare expert list into a `{ data: [...], count: N }` response envelope and renamed the `"estate"` property to `"location"`.

---

## 2. Why It Is Worth a Break
Returning bare JSON arrays (`[...]`) prevents an API from ever returning pagination metadata (such as `page`, `limit`, `totalPages`, or cursor tokens) without breaking clients. Wrapping the list into `{ data, count }` establishes an extensible envelope that supports future enhancements. Renaming `estate` to `location` standardizes geographical naming conventions across both university campus zones and county agricultural regions.

---

## 3. Prediction: Which Exact Line in Partner's Code Will Fail?
Farmers-AgroConnect's frontend or backend route that integrates with our expert directory will fail at their mapping/iteration step:
```javascript
// AgroConnect integration code:
const experts = await response.json();
experts.map(e => e.name); // THREAT: TypeError: experts.map is not a function
```
Because `response.json()` now returns an object `{ data, count }` instead of an Array, any code calling `.map()`, `.forEach()`, or `.length` directly on the root response will immediately crash. Furthermore, any UI template binding `expert.estate` will render `undefined` instead of the location.

---

## 4. Who Still Uses v1? (/stats and Log Analysis)
From examining our live `/api/stats` endpoint and terminal request log:
* `GET /api/experts` has recorded traffic from `caller: "agroconnect"`.
* `GET /api/v2/experts` has not yet received traffic from their automated worker.
* **Can we shut down v1 today?** Absolutely not. If we disabled v1 today, Farmers-AgroConnect's user-facing expert listings would break immediately. We must keep v1 running in parallel with `Deprecation: true` and `Sunset: Fri, 20 Nov 2026 00:00:00 GMT` headers until their traffic is observed on `/api/v2/experts`. Each v1 response also carries a `Link` header with the matching v2 URL. The sunset date is 20 Nov 2026; from that date v1 answers `410 Gone` (switched on with `V1_ENFORCE_SUNSET=true`). If AgroConnect is still calling v1 shortly before then, `V1_SUNSET_DATE` moves the date without a code change.

---

## 5. Reflection (Perspective-Taking & Upstream Migration)

Receiving a breaking change notice from our upstream partner, Maji Website, made the reality of distributed system dependencies immediately tangible. We first noticed the notice when evaluating our `/schedule` logistics cards, which fetch water vendor locations. Our immediate reaction was concern that our students' water logistics features would break, but our Week 11 resilient fallback cache protected us: because our client was programmed to serve saved data with a yellow warning banner on parse failures, our frontend never showed an unhandled crash to users.

Maji's notice did several things well: they provided clear before-and-after JSON schemas showing their new `{ data, count }` envelope and gave a definitive sunset date. However, they omitted whether query parameters like `?estate=` would remain supported on v2, which required us to test both `?estate=` and `?location=` by hand before updating our client. 

Re-reading our own notice to Farmers-AgroConnect from their perspective, we realized the importance of explicitly stating what does *not* change (such as existing API keys and query filters) so our partners do not waste time rewriting functional components. 

Next time as an API owner, our primary improvement will be releasing a companion mock or staging sandbox for v2 at least one week prior to issuing deprecation notices, giving partner teams an isolated sandbox to test before switching their production configuration.

