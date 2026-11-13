Name:Stephanie Jessica Kananga
Adm:211295
ICS C Team 5


# Individual Project Retrospective – SkillBridge

## 1. Which lifecycle stage was the hardest for me?

The versioning stage was one of the most challenging parts of the SkillBridge project. This was because we had to introduce API version 2 while still maintaining version 1 for existing users. It required more than just changing endpoint names. We also had to consider how users would access the new version and what would happen to the old endpoints.

My contribution involved documenting the changes and ensuring that the API documentation reflected the new structure. For example, commit `bcfead4` updated the OpenAPI documentation to include version 1 as deprecated and explain the version 2 endpoints, headers and 410 response. I also worked on the published documentation through commit `669f963`.

Another challenge was understanding how the sunset process would work. We had to make sure that users accessing the old version would receive the correct response and information about the replacement. This was addressed through changes such as `7c1a9eb` and `310874a`.

Through this stage, I learnt that API versioning requires proper planning and communication. Changes must be documented and tested so that users and other developers can understand how to work with the system.

## 2. What was one real cross-team issue?

One issue we experienced during integration involved communication between SkillBridge and the Maji Website team. On 26 October, there was a discussion about adding a `services` field to the information we needed from their API. However, the Maji team explained that consumers were expected to work with the existing API rather than requiring changes to their database.

This meant that we had to reconsider how we would use the information already available instead of depending on a new field. The disagreement showed me that teams working on connected systems need to agree on API requirements early.

The issue was also recorded in our integration documentation. The file `MAJI_CONTRACT_UPDATE.md` contained the updated contract information, while `INTEGRATION_LOG.md` helped keep track of integration issues and changes.

Looking back, I think earlier communication and clearer documentation of the API requirements would have reduced confusion. I learnt that when working with other teams, we cannot assume that another team will change its system to fit our requirements. We have to understand their existing implementation and find a solution that works for both sides.

## 3. What would I do differently if I could redesign the project?

If I had another opportunity to work on this project, I would prioritise documentation and communication much earlier. At some points, documentation had to be updated after implementation decisions had already been made. This made it harder to keep the README, API documentation and integration records consistent.

I would also introduce API versioning requirements earlier in the project. Having clear rules from the beginning about deprecated endpoints, response codes, headers and replacement links would make later changes easier to manage.

Another thing I would improve is how I organise and submit my work. I realised that completing a task locally is not enough if the changes have not been pushed to GitHub and made available to the rest of the team. I would therefore make smaller, more frequent commits and push them as soon as they are ready for review.

For example, our work on security headers, validation and testing involved commits such as `5cfabfb`, `8a679fc` and `16aa921`. These changes showed me the importance of testing and maintaining consistency across different parts of the API.

Overall, I would focus on planning, regular communication, testing and keeping documentation updated throughout the development process rather than treating documentation as something to do at the end.

## 4. How did my contribution compare with my assigned role?

My assigned role was Docs and DevOps Lead. However, my actual contribution went beyond writing documentation. I worked on API documentation, versioning, deployment configuration, security records and some testing-related changes

PS C:\Users\kanan\OneDrive\Desktop\skill\SkillBridge-webapp> git log origin/main --author="stephanie.jessica@strathmore.edu" --pretty=format:"- %h — %s"
- c1c1092 — Update individual retrospective
- 94ffb37 — Document individual contributions and commit history
- 6222088 — Add individual retrospective
- fc03dde — Integration log: Maji's 12 Nov notice that v1 estates stops on 13 Nov
- f028080 — Security audit: record how the AgroConnect and team keys were shared
- 7124d81 — render.yaml: enforce the v1 sunset (410 from 20 Nov 2026)
- a433425 — Notice and versioning notes: path-aware Link header, 410 body and the 20 Nov sunset
- ba7bd85 — Rebuild published docs (Redoc, JSON, Swagger) from openapi.yaml 2.0.0
- 364264f — OpenAPI 2.0.0: document v1 (deprecated) and v2 experts, headers and 410
- 37982c7 — README: Team 6, v2 quickstart and an API Versions section
- c5e6f81 — Integration log: Team 6, and the 28-29 Oct vendors/all 404 and 401
- aeb019b — Merge pull request #7 from Stephaniekans/main
- a03ba94 — Update App.jsx
- 53a96a2 — Merge branch 'rickkyalo-glitch:main' into main
- 4547c7f — Update App.jsx
- 4e2570d — Update ReviewModal.jsx
: