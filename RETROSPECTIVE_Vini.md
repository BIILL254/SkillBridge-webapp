# SkillBridge: Individual Project Retrospective

**Name:** Chege Vincent Mugo | **Team:** 5, SkillBridge | **Group:** C

## 1. The Hardest Stage of the Lifecycle

Versioning was the hardest stage for me. In Week 13 we deprecated v1 of the experts API and added v2 with a nested location structure. v1 had to keep working while telling consumers it was going away, so every v1 response needed a correct `Link` header pointing to its successor.

The first version of that header pointed to the same URL for every path, so a caller on one route was sent to a generic successor instead of the matching one. The fix made it follow the path and added an optional 410 once the Sunset date passes, controlled by an environment variable (7c1a9eb); I applied and tested that change, with tests for both behaviours (310874a). Even delivering the changes was slow: the packaged commit script failed twice because of folder problems before it worked on the third try. The suite now passes 509 tests, 504 before the estates work.

## 2. A Cross-Team Issue

We found out about the issue from Maji's own notice in November about the move from v1 to v2, which included an estates endpoint that our client did not handle. Our version switch only covered vendors, so the estates call would have broken as soon as v1 stopped. I helped keep in touch with the Maji team and applied the fix: the estates request now tries v2 first, then v1, then the Week 4 contract (4901c33).

We had not confirmed that Maji's v2 estates endpoint was live. The notice said it existed, but it had not been verified. Rather than wait, I committed a stand-in partner that serves the wrapped v2 estates list (f1031e8), so we could test both response shapes without depending on Maji. We received the notice midweek in November, and the fix took about two days, so it was caught before v1 stopped rather than by a broken page. Afterwards our estates call no longer depends on a single version, and the suite passes 509 tests. The notice and our response are recorded in `INTEGRATION_LOG.md`.

## 3. What I Would Design Differently

I would ask each partner for versioned URLs from the start, and confirm which version a partner is running before building against it. The estates problem came from not having confirmed Maji's version. I would also keep the sunset date in an environment variable, as we did with `V1_SUNSET_DATE`, because it let us change the deadline without editing code.

The v1 and v2 expert routes used separate query-parsing code, and the difference surfaced in our hardening review. Replacing both with one shared parser (a2ece99, e9693ba, with parity tests in 16aa921) fixed it, and I would write that shared code from the start. I would also keep the stand-in partner idea, because it let us test both response shapes without waiting on Maji. And I would keep adding tests with each hardening change: the security headers (5cfabfb), the JSON 404 (78cf809) and the consultation length limits (8a679fc) each shipped with tests.

## 4. My Contribution to the Project

On paper my role began as Integration and QA Lead, but at some point we stopped rotating roles and I stayed in the backend role. I worked mainly as a backend developer and helped communicate with the Maji team. Backend was not my strongest area at that point, and Rick helped me with it. My commits cover query validation, input limits (8a679fc), security headers, the 404 handler, versioning and the Maji estates fix. 955b56e is documentation only, not code. AI was a helper on the hardening code, which was drafted in the team session, but we did most of the work ourselves; my part was applying it, testing it and shipping it. The commits were re-applied in November, so their dates show then.

I carried a teammate on the versioning work. We had agreed that Rick and Bill would do it, but I chose to take it on myself.

I completed my own role on time, so I have nothing late or unfinished to report.

I would rate my contribution 8/10. The evidence is my commit history in the appendix: the hardening commits and the Maji estates fix.

## Appendix: Commit Evidence

My commits appear under the author name chegevince6-tech. The commits below cover August 2026 to now. The nine hardening commits were authored in the team hardening session and re-applied in November 2026.

| Commit | Date | Message |
|----------|----------|------------------------------------------------------------|
| a2ece99 | Nov 2026 | Add shared expert query validation util with unit tests |
| e9693ba | Nov 2026 | Use shared query validation in v1 and v2 expert routes |
| 16aa921 | Nov 2026 | Test malformed query strings and v2 validation parity |
| 8a679fc | Nov 2026 | Limit consultation farmerName and topic length, with tests |
| 5cfabfb | Nov 2026 | Add security headers middleware (nosniff, no-store, frame deny) |
| 78cf809 | Nov 2026 | Return a JSON 404 for every unknown path; test headers and 404 |
| 7c1a9eb | Nov 2026 | Versioning: successor link follows the path; optional 410 after Sunset |
| 310874a | Nov 2026 | Test v1 sunset: 410 after the date and path-aware successor link |
| 955b56e | Nov 2026 | Document V1_SUNSET_DATE and V1_ENFORCE_SUNSET in .env.example |
| 4901c33 | Nov 2026 | Maji estates: try v2 first, then v1, then the Week 4 contract (v1 stops 13 Nov) |
| f1031e8 | Nov 2026 | Stand-in partner: serve the wrapped v2 estates list |
