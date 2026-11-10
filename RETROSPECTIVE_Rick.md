\# SkillBridge: Individual Project Retrospective



\## 1. The Hardest Stage of the Lifecycle



The integration stage was the most challenging part of the project for me. We were comfortable developing our own application, but working with external APIs was relatively new to us. We had to understand another team's documentation, endpoint structures and deployment setup while ensuring that our application could communicate with theirs. In October, we experienced difficulties accessing Maji's service, with Bill reporting that he could not connect even though Maji indicated that their server was running.



Another challenge was that our requirements did not always match what the partner was willing or able to provide. On 26 October, for example, we proposed adding a services field to help identify vendors offering particular services. Maji explained that consumers were expected to work with their existing API rather than request changes to their database. Their free-tier server could also take up to a minute to wake up, which made testing frustrating. I realised that reading documentation was not enough; we needed to test the actual endpoints and understand how the partner's deployment worked. This stage taught me that integration requires patience and flexibility, especially when two teams have different systems and expectations.



\## 2. A Cross-Team Issue



One significant cross-team issue occurred when we needed an endpoint to retrieve Maji vendors who could potentially provide water sales or water treatment services. On 28 October at 11:51, I contacted Maji to request an endpoint for this purpose. At 12:32, they responded that they could provide all vendors, leaving us to classify them according to our application's requirements.



On 29 October at approximately 01:30, I tested `/api/vendors/all` but received a 404 response with the message "Cannot GET /api/vendors/all". The endpoint was also missing from Maji's OpenAPI documentation and README. After I requested deployment, Maji explained at 10:25 that they had forgotten to push the changes to GitHub. Later, API key authentication was enforced, resulting in 401 responses. I sent a three-point bug report and identified that the key had not been configured in Maji's Render environment. Their team added the keys at approximately 23:37, after which the endpoint worked and returned over 50 vendors. The process took approximately 36 hours from the initial request to successful testing. I handled the request, testing and diagnosis, while Bill contributed the integration work through commits `fee6531` (29 October), `c975ce1` (1 November) and `a89c812` (2 November). My related commits were `68e3f9e` and `7a2a3a2`, covering the vendor endpoints and request-exchange button.



\## 3. What I Would Design Differently



If I were to approach the project again, I would become involved in partner communication earlier. Initially, I left most of this responsibility to Bill and Vincent because it was part of their roles and they already had a relationship with Maji's leader. However, when I contacted Maji directly on 28–29 October to request and troubleshoot the vendor endpoint, I realised that I could also contribute to resolving integration issues through direct communication.



I would also agree on endpoint fields, authentication requirements and API-key configuration with the partner before beginning integration testing. On 29 October, the missing API key in Maji's Render environment caused approximately an hour of 401 errors. Clarifying these requirements earlier could have saved time. I would also test against the partner's actual API sooner rather than relying too heavily on documentation. Internally, I would improve my time management when preparing lab drafts. Some of my drafts were not as complete or timely as they could have been because of other pending work and, at times, forgetfulness. I would start earlier and leave enough time for review. I would, however, retain peer review because Bill, Stephanie and Vincent's suggestions and edits helped improve the work. My main lesson is to make sure our solutions meet the partner's specific requirements, not just our own.



\## 4. My Contribution to the Project



My initial assigned role, according to the team charter, was API Lead, but my actual contributions extended into backend development and deployment-related work. I helped build the initial backend and SQLite database in August (`7e23b87`, 20 August). In September, I contributed server-side validation and error handling (`15a4788`), the downstream AgroConnect API and upstream Maji integration (`b84e3a8`), authentication and the admin panel (`ff92b69`), and a DELETE handling fix and contract deviations documentation (`517e46f`). In October, I worked on documentation and deployment configuration, including the endpoint list (`3fe6012`, 16 October) and Render configuration (`4e9aa94`, 19 October). I later contributed API key authentication, rate limiting and a security audit (`71d4189`, 27 October), as well as the Maji vendor endpoints and request-exchange button. Working on the vendor cards also helped me learn more about CSS.



I also took on documentation and deployment-related work beyond my initial API Lead responsibilities, including tasks that were closer to the documentation and DevOps work assigned to Stephanie in the original charter. These contributions helped support the wider application. During the later part of the project, my contribution was mainly drafting lab work. Bill reviewed my drafts first, after which Bill, Stephanie and Vincent edited them or used them as submitted. I acknowledge that I let my teammates take the forefront during this period, and my drafts could sometimes have been more complete or submitted earlier. My Git history also shows a gap between 23 September and 15 October; the CAT pause explains part, but not all, of that period. I would rate my contribution \*\*8/10\*\* because I made substantial technical contributions across the project, particularly in backend development, security and Maji integration, while recognising areas where my consistency and involvement could have been better.

