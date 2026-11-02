# Monitoring Notes — Week 12

**Where the code lives:** `server/middleware/monitoring.js` (the logger and `/api/stats`), wired in first in `server/app.js`; tests in `__tests__/monitoring.test.js`; traffic generator in `scripts/traffic.js`.

> Before you submit: fill in every **[FILL IN]** with numbers from YOUR run. Part 1 (the predictions) must be your own words and written before you look at any numbers; the ones below are a draft with reasoning, so edit them to say what you actually think.

## 1. Predictions (written before I had any data)

**Slowest endpoint:** I think `POST /api/auth/login` will be the slowest, because it checks the password with bcrypt, which is deliberately slow (tens of milliseconds), while every other endpoint is one small database read. After that I expect the endpoints that call Maji (`/api/logistics/...`) to be slow, because they make a network call to another server on a free host and can retry.

**Most errors:** I think the most failures will be `401`s from calls with no key or a wrong key, then `404`s on `GET /api/experts/:id` for ids that don't exist. I expect almost no `5xx`, because the server only fails when something unexpected breaks.

## 2. What the data shows

Traffic captured in this workspace: **none**. There is no `requests.log` or saved `/api/stats` response in the repository, so I cannot report personal or ring-partner request counts as measured facts. The entries below identify the exact values to record after running the traffic generator.

`GET /api/stats` after the traffic (paste the output):

```json
Not captured yet. Paste the JSON returned by `GET /api/stats` after running `scripts/traffic.js` and receiving the ring partner's traffic. Do not include an API key in this file.
```

| Question                                                   | Answer, with numbers                                     |
| ---------------------------------------------------------- | -------------------------------------------------------- |
| Slowest endpoint on average (`avgMs`)                      | Not measured: no saved `/api/stats` output.               |
| Slowest single request (`maxMs`)                           | Not measured: no saved `/api/stats` output.               |
| Endpoint that fails most (`clientErrors` / `serverErrors`) | Not measured: no saved `/api/stats` output.               |
| Are the 401s a mistake or probing?                         | Not determined: no request log is present to inspect `"caller":"none"`. |
| Error rate (`errorRatePercent`)                            | Not measured: no saved `/api/stats` output.               |

**Prediction vs. data:** Cannot compare yet because no runtime traffic measurements are saved. After collecting traffic, compare the slowest route's `avgMs` and the route with the highest 4xx/5xx counts against the predictions in Part 1.

## 3. One real pattern in my own traffic

No measured pattern can be stated yet because the runtime stats and request log were not saved. Record one route's `count`, `avgMs`, `maxMs`, and error counts from `/api/stats` here after a traffic run.

**Why I think it happens, and what I would check next:** Pending a measured pattern. Once one is available, compare its status codes and timing to the corresponding JSON log lines, then check whether the route is doing database work or waiting on Maji.

## 4. Sample log lines

```
No sample log lines are present in the workspace yet. After capturing `requests.log`, paste one real 200 line and one real 401 line here. The 401 should have `caller":"none"`; do not paste API keys or tokens.
```

Key-leak check: not run because `requests.log` is not present. Once the log is captured, run `grep -c "<your-real-key>" requests.log` (or the PowerShell equivalent); expected result: **0**.

## 5. An alert I would want in production

**Number:** `errorRatePercent` (5xx only) from `/api/stats`.
**Threshold:** above 5% for 5 minutes in a row, or `events.majiCallFailed` rising by more than 10 in 5 minutes.
**What should happen:** a person gets a message (email or chat) with the route that is failing and the last few log lines.
**While they fix it:** thanks to last week's work the feature should already be coping. If Maji is the cause, students still see the last saved vendors with a "Showing saved data from HH:MM" banner instead of an error, and `events.majiSavedCopyServed` tells us how often that happened.

## 6. Honest limits

The totals live in the server's memory, so they reset when it restarts (our free host also restarts it after idle time), and they would be wrong across several server copies. The host's uptime check on `/api/health` is deliberately left out of the log and the totals, because it fires every few seconds and would drown real traffic (set `MONITOR_HEALTH=1` to include it).
