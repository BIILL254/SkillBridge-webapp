# Week 11: Partner resilience notes

## Failure drill observations

| Partner condition | What the user sees | What the server log shows |
| --- | --- | --- |
| Partner stopped before any successful response | A clear unavailable notice on Schedule > Water & Logistics or Discover > Water vendors; the page remains usable. | A timeout or network error, followed by the final partner-call failure. |
| Partner is slow (stand-in `slow` mode) | If a previous response was saved, the same data appears with a banner showing when it was saved; with no saved response, an unavailable notice appears. | Each timed-out attempt is reported, followed by the final timeout. |
| Partner is flaky (stand-in `flaky` mode) | The request succeeds on the third attempt and the user sees live results. | Two retry warnings, then a successful response. |
| Partner returns a permanent 404 | The request fails promptly and the user sees the unavailable state if there is no saved copy. | One HTTP 404 failure; a permanent client error is not retried. |

These are the expected outcomes from the configured failure modes. The real Maji outage drill still needs to be coordinated with that team; this implementation does not claim that an outage was induced against their live service.

## Timing choices

- Timeout: 1,500 ms per request. This matches the lab's suggested starting point and gives a normally fast API call room to finish without letting one partner hold the page open for many seconds.
- Retries: at most 2 retries, for 3 attempts total. Only GETs retry; network errors, timeouts, 429, and 5xx responses can retry. HTTP 400, 401, 403, and 404 return without retrying. Writes never retry.
- Backoff: 200 ms before the second attempt and 400 ms before the third. A numeric `Retry-After` on 429 replaces that delay, capped at 5 seconds.
- Worst case for ordinary transient errors: `(2 retries + 1) × 1,500 ms + 200 ms + 400 ms = 5,100 ms`. If both retry responses are 429 and each asks for the capped five-second wait, the upper bound is 14,500 ms. The retry count is clamped to two even if configuration requests more.

## User impact

On the Schedule page, the Water & Logistics card lists vendor locations and active delivery zones used when students plan an in-person study session. On Discover, the Water vendors card helps students find people to contact about water sales and treatment. Before this change, a slow Maji response could leave the request waiting and a temporary outage could replace useful results with an error. The server now times out, retries only safe transient reads, and serves the last successful response from memory when available. Both cards identify saved results and show their save time, so students can judge whether the information may have changed. If the server has no saved response yet, the cards explain that partner data is unavailable and keep the rest of the page usable.

## Not implemented

A circuit breaker is not implemented. It would track repeated failures and temporarily stop sending calls to Maji, then allow a later probe; that could reduce load on a partner during a sustained outage. The current integration still attempts each request, bounded by the timeout and retry limit.
