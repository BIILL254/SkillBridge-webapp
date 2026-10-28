# Maji contract update (28 October 2026)

This note is dated on purpose. `MAJI_OPENAPI_RECEIVED.yaml`, `CONTRACT_QUESTIONS.md` and `API_NEEDS_UPSTREAM.md` are earlier-week snapshots and were left unchanged.

## What happened

Our integration reported two 404s from Maji. Maji replied that both came from documentation, not a broken API:

1. `GET /vendors/stations` no longer exists. It was in Maji's Week 4 contract (the version we saved as `MAJI_OPENAPI_RECEIVED.yaml`). Maji replaced it with `GET /api/vendors/locations`, but did not send us the updated contract directly.
2. `GET /api/vendors/top-rated` needs the `/api` prefix, like Maji's two orders endpoints.

Maji's current contract is saved here as `MAJI_OPENAPI_CURRENT.yaml` (source: https://github.com/NgwonoJeremy/maji-website/blob/main/openapi.yaml). It needs no authentication and has four read-only endpoints.

## Old to new

| | Week 4 copy | Current contract |
|---|---|---|
| Vendor stations | `GET /vendors/stations` returned `vendorId`, `stationName`, `targetEstateId` | `GET /api/vendors/locations` returns `vendorId` (integer), `businessName`, `estate` |
| Filter by estate | none (we had to join against `/estates` ourselves) | `?estate=Kasarani` (Maji's spelling, capitals ignored, blank gives 400) |
| Top vendors | not in the contract | `GET /api/vendors/top-rated` (adds `rating`, `isVerified`, `isOnline`, `ownerName`, `phone`) |
| Estates and schedules | `GET /estates` | `GET /api/orders/active/estates` and `GET /api/orders/active/schedules` |
| Payment method, driver interests | present | not in the current contract |

## What changed in our code

* `server/services/majiClient.js`: `getStations()` now calls `/api/vendors/locations` and uses Maji's estate filter (the extra `/estates` round trip is gone). New `getTopRatedVendors()`. Student addresses like "Kasarani, Nairobi" are shortened to "Kasarani". The timeout is 30 seconds (default, `MAJI_TIMEOUT_MS`), because Maji's free host can take up to a minute on the first call after sitting idle.
* `server/routes/logistics.routes.js`: `GET /api/logistics/stations` (new field names, blank `estate` gives 400) and new `GET /api/logistics/vendors/top-rated`.
* We return only the fields we use. Maji's top-rated vendors include an owner's name and phone number; we do not pass those on.
* Frontend: the vendor card shows `businessName` with a top-rated badge, and also appears when the Water Sales or Water Treatment filter is active on Discover.
* `openapi.yaml`, `docs/`, `README.md` and `__tests__/logistics.test.js` were updated to match.

## Still open

* Maji's current contract does not say what a vendor does beyond being a water vendor (no "water treatment" field), so we cannot yet list treatment providers separately.
* `GET /api/logistics/estates` (`?deliveryStatus=`) and the driver-interest route still follow the older shape. Maji's `/api/orders/active/estates` returns only estate names, which `majiClient.js` already adapts.
* We could not call Maji's live server from our build environment, so the live paths were tested against a faked Maji (see `__tests__/logistics.test.js`). Please try them once against the real server from your own machine.

---

## Addendum, 29 October 2026: all vendors

Maji added `GET /api/vendors/all` and `GET /api/vendors/all?estate=Kasarani`, at our request, so we can list their vendors. Each vendor has `vendorId`, `businessName`, `estate`, `rating`, `isVerified`, `isOnline`, `ownerName` and `phone`. An estate with no vendors returns `[]`; a blank `estate` returns 400. Maji treats every vendor as someone students can approach about water sales and treatment, so there is no separate trainer field.

* **Not yet verified by us.** At the time of writing, this endpoint was not in the `openapi.yaml` or README on Maji's GitHub, and we could not reach their live server from our build environment. It was built from their message, and the live calls were tested against a faked Maji. Please check it against the real server and tell us if the fields differ.
* **Decision (live list, nothing stored):** vendors are fetched from Maji when needed, not copied into our database, so `/api/experts` (which AgroConnect uses) is unchanged.
* **Decision (contact details):** unlike `/vendors/top-rated`, where we drop owner name and phone, `GET /api/logistics/vendors/all` passes them on, because students need to reach a vendor who is meant to teach them. The route needs the API key and a student login. To hide them again, remove `ownerName` and `phone` from `getAllVendors()` in `server/services/majiClient.js`.
* **Where it shows:** the Discover page, as "Water vendors" under the Water Sales and Water Treatment filters (`src/components/WaterVendorsCard.jsx`), with vendors in the student's own estate first.
