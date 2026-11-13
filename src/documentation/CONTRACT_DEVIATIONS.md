# Contract Deviations

## Changes to `openapi.yaml` since the Week 4 contract (recorded here in one place)

The Week 4 contract has changed since it was first sent to Farmers-AgroConnect. Each change and why:

| When | Change | Why |
| :--- | :--- | :--- |
| Week 8 | The logistics paths (`/stations`, `/estates`, `/payment-methods`, `/deliveries`) were replaced by what the server really serves: `/api/logistics/...` with bearer auth, plus the auth, health and driver-interest endpoints. `GET /logistics/deliveries/{id}` and `POST /logistics/deliveries` are documented as `501`. | The blind test showed the contract listed old paths that the server did not have; Maji has no delivery API. Fixing the contract to match the real server was the honest option. See `BLIND_TEST_REPORT.md`. |
| Week 9 | Added the `apiKeyAuth` scheme and `401` and `429` responses on every operation. | Every endpoint except `GET /api/health` now needs an `X-API-Key`. |
| Week 13 | Added `/v1/...` and `/v2/...` expert paths; v2 wraps lists in `{ data, count }` and renames `estate` to `location`. | Breaking change shipped beside v1 (see `DEPRECATION_NOTICE.md`). |

For Week 5, the GET endpoints were checked against the contract by the automated tests in `__tests__/`; the changes in the table above are the places where the contract, not the code, was changed.

## Week 7 check-in

Reviewed against this week's changes (automated tests + the fixes they
surfaced — see PARTNER_TEST_RESULTS.md and the test suite in `__tests__/`).
Nothing new to add here: everything fixed this week brought the
implementation in line with `openapi.yaml`, which already existed — none of
it was a deliberate deviation. The three entries below, from Week 6, are
still accurate as written.

Places where a write endpoint's real behavior deliberately differs from the
strictest reading of the Week 6 rules (PUT/PATCH must be idempotent,
missing/wrong resource → 404), along with why.

## 1. `PATCH /api/profile/coins` is not idempotent, on purpose

Week 3's rule is that a PUT/PATCH should set an absolute state, not
increment or toggle one — calling it twice should leave the same result.
This endpoint takes a `delta` (e.g. `+1`, `-3`) and adds it to the current
balance, so calling it twice with the same body changes the balance twice.

This is intentional. `/profile/coins` isn't "set my balance to X" — it's
"record one earn/spend event," the same way a bank's deposit endpoint
isn't expected to be idempotent either. Each call represents a distinct
transaction (and is logged as one in `coin_history`), not a state
overwrite. Modeling it as a PATCH that sets an absolute balance would
actually be less correct here, since the frontend never knows the "right"
absolute number to send — it only knows "the user just earned 1 coin."

## 2. `DELETE /api/profile/skills/:type/:value` doesn't 404 on a missing skill

Removing a skill that isn't actually in the user's list still returns
`200` with their (unchanged) profile, rather than `404`.

This is a deliberate "delete if present" pattern rather than a strict
resource-lookup delete. The end state the caller wants — "this skill is
not on my profile" — is already true either way, so treating "already not
there" as an error would be surprising UX for something as low-stakes as
a skill tag, and doesn't match how the Discover/Profile UI calls this
endpoint (it never expects an error here). `DELETE /api/requests/:id` and
`DELETE /api/admin/users/:id`, by contrast, target a specific numbered
resource where "it doesn't exist" is a genuinely meaningful, reportable
case — those correctly return 404.

## 3. Admin self-protection returns `400`, not a plain success/failure

`DELETE /api/admin/users/:id` and `PATCH /api/admin/users/:id` (when
changing `role`) both return `400` if an admin targets their own account
in a way that would lock them out (deleting themselves, or demoting
themselves away from admin). This is a business rule layered on top of
the normal CRUD behavior, not a validation-of-input-shape case — the
request is well-formed, it's just disallowed for that specific actor/
target combination.

## 4. Fixed this week

`DELETE /api/requests/:id` previously returned `204` even for a
nonexistent request ID (it never checked whether anything was actually
deleted). Fixed by having `removeRequest()` report whether a row was
actually removed, and the route now returns `404` when it wasn't.
