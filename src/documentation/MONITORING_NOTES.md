# Monitoring Notes — Week 12

**Where the code lives:** `server/middleware/monitoring.js` (the logger and `/api/stats`), wired in first in `server/app.js`; tests in `__tests__/monitoring.test.js`; traffic generator in `traffic.js` (repo root).

## 1. Predictions (written before I had any data)

**Slowest endpoint:** I think `POST /api/auth/login` will be the slowest, because it checks the password with bcrypt, which is deliberately slow (tens of milliseconds), while every other endpoint is one small database read. After that I expect the endpoints that call Maji (`/api/logistics/...`) to be slow, because they make a network call to another server on a free host and can retry.

**Most errors:** I think the most failures will be `401`s from calls with no key or a wrong key, then `404`s on `GET /api/experts/:id` for ids that don't exist. I expect almost no `5xx`, because the server only fails when something unexpected breaks.

## 2. What the data shows

Run: local server, fresh database, `API=http://localhost:3001 KEY=<team key> N=150 node traffic.js` (13 Nov 2026), plus 2 hand-made requests (a valid key and a wrong key) before it. This is one machine and one caller (`team`), so it is **my own traffic only**: I have no ring-partner traffic yet, and I did not call `POST /api/auth/login`, so that part of my prediction is untested.

Status codes the script received: 200 ×69, 201 ×7, 400 ×9, 401 ×14, 404 ×14, 429 ×37.

`GET /api/stats` after the run (read with a different key, because the `team` key was already rate limited):

```json
{
  "startedAt": "2026-11-13T20:26:42.388Z",
  "uptimeSeconds": 12,
  "total": 152,
  "clientErrors": 75,
  "serverErrors": 0,
  "errorRatePercent": 0,
  "avgMs": 1.3,
  "routes": {
    "GET /api/experts": {
      "count": 41,
      "clientErrors": 9,
      "serverErrors": 0,
      "avgMs": 1.7,
      "maxMs": 8.2
    },
    "GET (no route)": {
      "count": 53,
      "clientErrors": 53,
      "serverErrors": 0,
      "avgMs": 0.6,
      "maxMs": 1.2
    },
    "GET /api/skills": {
      "count": 9,
      "clientErrors": 0,
      "serverErrors": 0,
      "avgMs": 1.1,
      "maxMs": 1.3
    },
    "GET /api/experts/:id/reviews": {
      "count": 9,
      "clientErrors": 0,
      "serverErrors": 0,
      "avgMs": 1.7,
      "maxMs": 2.3
    },
    "GET /api/experts/:id": {
      "count": 20,
      "clientErrors": 10,
      "serverErrors": 0,
      "avgMs": 1.9,
      "maxMs": 4.2
    },
    "POST /api/requests": {
      "count": 7,
      "clientErrors": 0,
      "serverErrors": 0,
      "avgMs": 2.8,
      "maxMs": 6.8
    },
    "GET /api/experts/:id/availability": {
      "count": 10,
      "clientErrors": 0,
      "serverErrors": 0,
      "avgMs": 1.8,
      "maxMs": 2.3
    },
    "POST (no route)": {
      "count": 3,
      "clientErrors": 3,
      "serverErrors": 0,
      "avgMs": 0.6,
      "maxMs": 0.6
    }
  },
  "events": {}
}
```

| Question | Answer, with numbers |
| --- | --- |
| Slowest endpoint on average | `POST /api/requests`, 2.8 ms avg (7 calls). It writes to the database; every read is 1.1 to 1.9 ms. |
| Slowest single request | `GET /api/experts`, 8.2 ms max, against a 1.7 ms average. |
| Fails most | `GET (no route)`: 53 of 53 calls were 4xx. These are the 401s and 429s rejected before any route runs, plus unknown paths. Among real routes, `GET /api/experts/:id` had 10 of 20 calls as 404, because the script asks for id 9999 on purpose. |
| Are the 401s a mistake or probing? | Neither: I sent them on purpose (the script's no-key requests plus my wrong-key test). The log shows 15 lines with `"caller":"none"`. |
| Error rate | 0% (`serverErrors` is 0 of 152 requests). 75 of 152 were 4xx, mostly the 37 rate-limit rejections and my deliberate bad requests. |

**Prediction vs. data:** I predicted the slowest would be login (bcrypt) and then the Maji routes. The traffic mix never called either, so I cannot confirm that. I predicted most failures would be 401s then 404s. The data differs: the biggest group was **429s (37)**, then 401s (14) and 404s (14).

## 3. One real pattern in my own traffic

`GET /api/experts` averaged 1.7 ms but its slowest call was 8.2 ms (about 5x the average), and 9 of its 41 calls were 4xx. The bigger pattern is that **37 of 152 requests (24%) were 429s**: the script sends 150 requests in about 8 seconds, so one key passes its 100-per-minute limit after about 100 requests and everything after is rejected.

**Why I think it happens, and what I would check next:** the 429s are the Week 9 limiter doing its job against a fast loop, not a bug. The 8.2 ms outlier is probably the first call after start-up (cold database statement). To check, I would look at the first `GET /api/experts` line in the log and see whether it is the slow one. I would also run the script with `N=90` (under the limit) to confirm the 429s disappear.

## 4. Sample log lines

Real lines from `requests.log` (no key, query string or body appears in them):

```
{"time":"2026-11-13T20:26:46.269Z","method":"GET","path":"/api/experts/13/reviews","status":200,"ms":1.7,"caller":"team"}
{"time":"2026-11-13T20:26:46.158Z","method":"GET","path":"/api/experts","status":401,"ms":1.2,"caller":"none"}
{"time":"2026-11-13T20:26:52.119Z","method":"GET","path":"/api/experts/13/availability","status":429,"ms":0.7,"caller":"team"}
```

Key-leak check: `grep -c "dev-team-key" requests.log` printed **0**.

## 5. An alert I would want in production

**Number:** `errorRatePercent` (5xx only) from `/api/stats`.
**Threshold:** above 5% for 5 minutes in a row, or `events.majiCallFailed` rising by more than 10 in 5 minutes.
**What should happen:** a person gets a message (email or chat) with the route that is failing and the last few log lines.
**While they fix it:** thanks to last week's work the feature should already be coping. If Maji is the cause, students still see the last saved vendors with a "Showing saved data from HH:MM" banner instead of an error, and `events.majiSavedCopyServed` tells us how often that happened.

## 6. Honest limits

The totals live in the server's memory, so they reset when it restarts (our free host also restarts it after idle time), and they would be wrong across several server copies. The host's uptime check on `/api/health` is deliberately left out of the log and the totals, because it fires every few seconds and would drown real traffic (set `MONITOR_HEALTH=1` to include it).