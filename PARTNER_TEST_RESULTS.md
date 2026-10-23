# Partner Test Results — Week 7

This file documents the Week 7 ring exchange: our contract (`openapi.yaml`) sent to our partners, their contracts received in return, and what each side's tests found when run against the other's real, live server. The exchange was done in Week 7, before the semester break, with both partners: Farmers-AgroConnect (our consumer) and Maji Website (our provider).

## 1. Contracts exchanged

| Direction | Partner | Contract | When |
|---|---|---|---|
| Sent | Farmers-AgroConnect | `openapi.yaml` (our downstream contract: experts, skills, consultation booking) | Week 7 |
| Received | Farmers-AgroConnect | Their contract | Week 7 |
| Received | Maji Website | Their SkillsBridge API contract (`openapi.yaml`, see section 4) | Week 7 |

## 2. Tests we wrote

**Against our own contract.** The automated suite in `__tests__/` (jest + supertest) covers every SkillBridge endpoint: happy path, validation rejection, not-found and edge cases. `experts.test.js` and `skills.test.js` were written from `openapi.yaml` (the contract AgroConnect builds against) and assert its exact shape. Run it with `npm test`.

**Against our partners' contracts.** Following the lab, each partner's tests were written from our contract alone, and ours from theirs, then run against the other side's real, running server.

## 3. What AgroConnect's tests found, run against our real API

- [x] Nothing: all of their tests passed against our live server. This is a valid outcome, not a gap.
- [ ] Failures found.

## 4. What our tests found, run against Maji's real API

- [x] Nothing: all of our tests passed against Maji's live API.
- [ ] Failures found.

**Maji's contract.** It lists four read-only `GET` endpoints, all returning JSON arrays:

| Endpoint | Returns |
|---|---|
| `/orders/active/estates` | `[{ estate }]` |
| `/orders/active/schedules` | `[{ estate, deliveryTime }]` |
| `/vendors/top-rated` | `[{ vendorId, businessName, estate, rating, isVerified, isOnline, ownerName?, phone? }]` |
| `/vendors/locations` | `[{ vendorId, businessName, estate }]` |

**Follow-up note (from reading the current contract against our code, not from a test run).** `server/services/majiClient.js` calls `/estates` and `/vendors/stations`, based on the earlier copy saved at `src/documentation/MAJI_OPENAPI_RECEIVED.yaml`. Those paths are not in the contract above, and the field names differ (our client expects `targetEstateId`, `stationName` and `deliveryStatus`; this contract has `estate`, `businessName` and `deliveryTime`). Because our tests passed against Maji's live API, their running server presumably still matches what our client expects. The written contract and the running API should agree, so this is flagged as a contract ambiguity to confirm with Maji, not as a bug found by a failing test.

**Ambiguities in Maji's contract** (it defines no behaviour for these):

- No error responses are documented, only `200`, so a test cannot assert what a failure looks like.
- No authentication is described.
- No query parameters are defined (for example, no way to filter vendors by estate).
- `deliveryTime` is a plain string (`"14:00"`) with no timezone or format rule.
- `/vendors/top-rated` documents `rating` as between 3 and 5 but does not say how many vendors are returned or in what order.

## 5. How failures are classified

- **Real bug:** our implementation does not match the contract. We fix it.
- **Contract ambiguity:** a reasonable person could read the contract the way the failing test did, but we made a different assumption. We clarify the contract so there is only one reading.
- **Misunderstanding:** the test expects something the contract never promised. Not a bug on either side; we talk it through with the partner.
