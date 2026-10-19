# Blind Test Report — Week 8

Project: SkillBridge API. Our README was tested by a classmate who had no prior context on the API, and we tested the RideCompare API using only its README. Both tests were run for real, against live servers.

## 1. Our README tested by another team

- **Who tested it:** Mwaura, Group 10 (RideCompare). He had never seen our API before and received `README.md` and a way to reach the API, with no verbal explanation.
- **Attempt 1: running the API locally from the README.** He followed the clone, `npm install` and `npm run server` steps. **Did not succeed.** `npm install` failed on `better-sqlite3`:
  - His machine runs Node v24.16.0. `better-sqlite3` has no prebuilt Windows binary for Node 24 (`No prebuilt binaries found (target=24.16.0 ... platform=win32)`).
  - npm then tried to compile it from source and failed because Visual Studio C++ build tools were not installed (`gyp ERR! find VS`).
  - Our README gave no Node version at all, so nothing warned him that the Node version mattered. He was stuck at step 2 of the local run.
- **Attempt 2: using a hosted copy.** Because of the Node problem, he switched to the alternative we offered: our running API exposed through a temporary Cloudflare tunnel. We confirmed that URL ourselves first (`GET /api/experts` returned all 14 experts).
  - **Did he get a successful response?** Yes.
  - **How long did it take, from opening the README?** About one hour in total. Nearly all of it was lost to the Node install failure; once he switched to the hosted URL he was not stuck again.
  - **Where he got stuck:** only at `npm install` on the local run. Nothing blocked him on the hosted URL.

## 2. Us testing their README (RideCompare API)

- **Did we make one successful call using only their README?** Yes, but **not** with their quickstart command.
- **How long did it take?** Roughly 10 to 15 minutes. It was quick because their README gave a live public URL (a temporary tunnel, like ours), so we only had to run `curl` and did not have to install or run anything. Their README had no local-run steps to test, so we cannot say whether those would have worked.
- **Where we got stuck, and why:**
  1. **Windows PowerShell:** `curl` is an alias for `Invoke-WebRequest` and shows a "Script Execution Risk" prompt before sending anything. We had to use `curl.exe`. Their README does not mention this.
  2. **The quickstart returned `[]`.** Their README promises an Uber ride with `type=Standard`. It also says an empty array is a valid response, so we could not tell whether this was a success or a failure.
  3. **Cause (our reading of the output):** the README says `type` accepts `Standard`, `Boda`, `XL`, but the real `rideType` values are names like `Uber Chapchap`, `Bolt Boda`, `UberXL` and `Little Comfort`, so the filter matched nothing.
  4. **No fallback:** the README says to use the "Run it yourself" section if the public address is offline, but that section does not exist, and the README gives no repository link.
- **What worked:** `GET /providers` (5 providers), `GET /rides/uber-x`, and `GET /rides` without `type` (about 16 ride estimates). That last call is our one successful call.
- **Verdict:** the API works, but following their README literally did not produce the promised response. A stranger with no one to ask would likely have stopped at the quickstart.

## 3. What we fixed in our docs as a result

- **Node version:** the README now says to use Node 20 or 22 (LTS), and warns that Node 24 fails at `npm install` with `No prebuilt binaries found`, with the fix (install Node 22).
- **Windows PowerShell:** the README now says to type `curl.exe` instead of `curl`, and gives an `Invoke-RestMethod` version of the login example, because JSON bodies break when passed to `curl.exe`.
- **Login example:** it now uses a demo student account instead of `admin`, and every example that needs a token uses `<token>` instead of a pasted value that fails for everyone else.
- **Contract vs. server:** `openapi.yaml` listed old logistics paths (`/stations`, `/estates`, `/payment-methods`, `/deliveries`). It now matches the real server (`/api/logistics/...` with bearer auth, plus the auth, health and driver-interest endpoints), and the docs pages in `docs/` were rebuilt from it.

## 4. Gaps we did not close today

- **No permanent hosted instance.** For the blind test we exposed the running API through a temporary Cloudflare tunnel. That URL expires and changes, so it is not in the README; a reader must run the API locally.
- **Dependency not upgraded.** We documented the Node 24 problem rather than fixing it. Upgrading `better-sqlite3` to a version with Node 24 binaries is the real fix, but it needs the full test suite re-run, so it is not done.
- **Demo passwords.** Seeded demo accounts use the password `1234`, and the README shows one in an example. The admin password can now be set with the `ADMIN_PASSWORD` environment variable for deployments; broader auth hardening is the Week 9 topic.
- **Fixed README not re-tested.** The corrections in section 3 have not been tested by a second stranger.

## 5. Honest summary

On the first real attempt, our README did not work for a stranger. Mwaura, on Node 24, could not get past `npm install`, and the README gave no hint that the Node version mattered. He only got a working response by switching to a temporary hosted copy of the API, and the whole test took about an hour, almost all of it lost to that install failure. We added the Node version guidance and PowerShell instructions to the README and corrected the contract and docs to match the real server, but we did not fix the underlying dependency or retest with a new reader. Testing the RideCompare README showed the other side of this: because it pointed to a live URL, our test took only 10 to 15 minutes, whereas our own local-run instructions cost a reader an hour. Its quickstart still looked complete but returned an empty array, and only trying other endpoints gave us a working response. Both teams depended on a temporary tunnel, so neither README is a lasting way in without a working local fallback.
