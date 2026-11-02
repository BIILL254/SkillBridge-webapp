### Monitoring: `GET /api/stats`

Running totals for the API since the server last started: how many requests, how many failed, and how long they take. It needs an API key like every other endpoint (`/stats` works as an alias).

```bash
curl -H "X-API-Key: <your-api-key>" https://skillbridge-api-p6s9.onrender.com/api/stats
```

On Windows PowerShell, use `curl.exe` instead of `curl`.

Example response (the numbers are illustrative):

```json
{
  "startedAt": "2026-11-05T08:00:12.481Z",
  "uptimeSeconds": 3600,
  "total": 142,
  "clientErrors": 31,
  "serverErrors": 0,
  "errorRatePercent": 0,
  "avgMs": 6.4,
  "routes": {
    "GET /api/experts": {
      "count": 40,
      "clientErrors": 5,
      "serverErrors": 0,
      "avgMs": 4.9,
      "maxMs": 31.2
    },
    "GET /api/experts/:id": {
      "count": 22,
      "clientErrors": 9,
      "serverErrors": 0,
      "avgMs": 3.1,
      "maxMs": 12.4
    },
    "GET (no route)": {
      "count": 14,
      "clientErrors": 14,
      "serverErrors": 0,
      "avgMs": 0.8,
      "maxMs": 2.1
    }
  },
  "events": { "majiCallFailed": 2, "majiSavedCopyServed": 2 }
}
```

- `clientErrors` are 4xx (usually the caller's mistake). `serverErrors` are 5xx (our fault). `errorRatePercent` counts 5xx only.
- Routes are grouped by pattern, so `/api/experts/13` and `/api/experts/14` share the row `GET /api/experts/:id`.
- `GET (no route)` holds requests that never reached a route: a 401 or 429 that was rejected earlier, or a 404 for a path that doesn't exist.
- `events` counts things that are not requests, such as how often Maji could not be reached and our saved copy was served instead.
- The numbers live in memory, so they reset whenever the server restarts.

Every request is also logged as one JSON line (`time`, `method`, `path`, `status`, `ms`, `caller`). The log never contains an API key, a query string, a password or a request body. `caller` is the consumer's name (for example `agroconnect`), and `none` when no valid key was sent.
