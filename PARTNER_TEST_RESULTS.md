# Partner Test Results — Week 7

This file documents the ring exchange: our contract (`openapi.yaml`) sent
out, our ring partners' contracts received in return, and what running each
side's tests against the other's *real, live* server actually found.

**Status: template only — not yet filled in.** The automated test suite
(`__tests__/`, 272 tests, all passing) is done and is SkillBridge's own
Part B work. Part C/D need something no one but Rick can do: the actual
exchange and live cross-testing with the AgroConnect and Maji Website
teams. This file is structured to match exactly what the handout asks for
— fill in each section as that happens.

## 1. Contracts exchanged

| Direction | Partner | Contract sent/received | Date |
|---|---|---|---|
| Sent | Farmers-AgroConnect | `openapi.yaml` (our downstream contract) | _TBD_ |
| Received | Farmers-AgroConnect | _their file, saved where?_ | _TBD_ |
| Received | Maji Website | Already have `src/documentation/MAJI_OPENAPI_RECEIVED.yaml`, from Week 4 | received Week 4 |

If Maji's contract hasn't changed since Week 4, that copy is still valid to
write tests against — no need to re-request it unless they've updated it.

## 2. Tests we wrote against a partner's contract

The `__tests__/experts.test.js` and `__tests__/skills.test.js` files in this
repo were already written directly from *our own* `openapi.yaml` (asserting
the exact contract shape — `latitude`/`longitude` not a nested object,
`reviewCount` not `reviews`, etc.) — that's the same discipline this step
asks for, just applied to our own downstream contract first. Once
AgroConnect's and Maji's contracts are in hand, write one test file per
partner API here, e.g.:

```
__tests__/partner-agroconnect.test.js   (tests written from THEIR contract,
                                          run against OUR live server —
                                          wait, the other way: this is what
                                          WE expect when consuming THEM)
__tests__/partner-maji.test.js
```

To be precise about direction: AgroConnect writes tests from our contract
and runs them against our server (that's what's covered above). We write
tests from Maji's contract and run them against Maji's real server, since
we're the consumer there — put those in a new test file once you have
their live URL.

## 3. What AgroConnect's tests found, run against our real API

_Fill in after they actually run their tests against a live SkillBridge
instance (`npm run server`, reachable at a shared URL or in person)._

- [ ] Nothing — all passed
- [ ] Failures found:

| # | What failed | Real bug / contract ambiguity / misunderstanding | Fixed or flagged? |
|---|---|---|---|
| | | | |

## 4. What our tests found, run against Maji's real API

_Fill in after writing tests from `MAJI_OPENAPI_RECEIVED.yaml` and running
them against Maji's actual server._

- [ ] Nothing — all passed
- [ ] Failures found:

| # | What failed | Real bug / contract ambiguity / misunderstanding | Fixed or flagged? |
|---|---|---|---|
| | | | |

## 5. How to classify a failure (from the handout)

- **Real bug** — our implementation doesn't match our own contract. Fix it.
- **Contract ambiguity** — a reasonable person could read the contract the
  way the failing test did; ours just made a different reasonable
  assumption. Clarify the contract so there's only one reading, note the
  change here.
- **Misunderstanding** — the test expects something the contract never
  promised. Not a bug on either side — talk it through with the partner
  and note the outcome here.
