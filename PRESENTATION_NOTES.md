# Presentation Speaker Notes — TutorConnect

**15 minutes total · ~10 min slides + ~5 min demo & Q&A · May 5, 2026**

> **Before you start:** SSH in 5 minutes early and confirm `pm2 status` shows tutorconnect online and `curl http://10.192.145.179:4131/api/health` returns ok. Open the live URL in a browser tab. Have the slide deck full-screened in another window.

---

## Slide 1 — Title (15 seconds)

> "Hi everyone. I'm Calvin and I built TutorConnect — a peer tutoring platform for Kenyon students. It's running live at 10.192.145.179:4131, and I'll demo it at the end."

Move on. Don't linger.

---

## Slide 2 — Project Overview (60 seconds)

> "The problem: tutoring at Kenyon is ad-hoc. People find tutors through word of mouth, group chats, scattered messages. There's no quality control, no easy way for tutors to publish availability, and no review system."
>
> "TutorConnect solves that with three things: students can search for tutors and filter by subject and availability, they can book sessions through a request-confirm flow, and they leave reviews after — which feeds back into who shows up at the top of the list."
>
> "It's built for three roles: students search and book; tutors apply, set availability, and accept requests; admins approve tutor applications and moderate reviews."

---

## Slide 3 — System Features (90 seconds)

> "Here's the heart of the app — the session lifecycle. A student searches and requests, the tutor confirms or declines, the tutor marks it completed, and the student leaves a review. That's the whole booking loop, and every transition is enforced server-side."
>
> "The two columns at the bottom are what's actually doing the work."
>
> "On the left — business logic the database can't enforce. The state machine: only the tutor can confirm or complete; once a session is in a terminal state, it can't transition again. Availability fit: a request from 2-3 PM only goes through if it falls inside one of the tutor's weekly Tuesday slots. Conflict detection: I return 409 if another active session would overlap. And reviews: only after the session is completed, only by the student who attended, and the database has a UNIQUE constraint on session_id so 'one review per session' is impossible to bypass."
>
> "On the right — access control. Sessions, not JWT — that's what the auth assignment specified. Bcrypt for passwords. The /me response is sanitized through a helper, so the bcrypt hash never leaks — there's a regression test pinning that. Role middleware on every protected route."

---

## Slide 4 — Database Schema (75 seconds)

> "Seven tables. The shape directly follows the user stories."
>
> "Users is a single table with a role ENUM — student, tutor, admin. I considered three separate tables and decided against it: one table means simpler auth, no JOINs on login, and the role just drives middleware checks. Tutor_profiles is separate from users because not every user is a tutor — only people who apply. Keeping that split means students don't carry empty bio and gpa fields, and the 'pending application' state is clean."
>
> "Subjects and tutor_subjects are a normalized many-to-many — a tutor can teach Calc plus Intro CS without duplication. Availability is one row per weekly slot, which lets me filter 'tutors free on Tuesday' with a fast SQL query."
>
> "Sessions is the workflow table — the status ENUM enforces the state machine I just described. Reviews has a UNIQUE constraint on session_id so the database itself prevents double reviews."
>
> "Average tutor rating is computed at query time, not cached. With MVP-scale data the JOIN is cheap, and caching invites the 'cached value out of sync with reality' bug class."

---

## Slide 5 — Architecture (60 seconds)

> "Single-port architecture, per the scaffolding spec. One Express server doing two jobs: serving the JSON API at /api/* and serving the React build for everything else. There's no separate frontend dev server in production."
>
> "Three reasons this is the right call here. First, one process, easier to manage with PM2. Second, no CORS — same-origin everywhere — so my httpOnly session cookie just works. Third, sessions instead of JWT — the auth assignment said 'no JWT requirement,' and for a same-origin app sessions are simpler and more secure since there's no token sitting in localStorage waiting for an XSS bug."
>
> "Deployed via PM2 on the Kenyon server with a self-hosted GitHub Actions runner for CD."

---

## Slide 6 — API (30 seconds)

> "Roughly 25 endpoints across 8 resource groups. RESTful where it fits, with extra workflow actions where pure CRUD is the wrong shape — like PATCH /tutors/:id/status for the approval workflow, and PATCH /sessions/:id/status for the booking state machine."
>
> "Every protected endpoint goes through requireAuth or requireRole. Every request body goes through express-validator. Every SQL query is parameterized."

---

## Slide 7 — Testing & CI/CD (60 seconds)

> "64 tests. 44 backend integration tests using Vitest and Supertest hitting a real MariaDB — not mocks. 12 frontend component tests with React Testing Library. 8 end-to-end Playwright tests against the running app."
>
> "The CI is GitHub Actions and it spins up a real MariaDB 10.11 service container, loads my schema, and runs all the tests. That caught a real bug — MariaDB returns TIME columns as 'HH dot 14 colon 00 colon 00' but my form inputs were 'HH colon 14 colon 00' — the string comparison was silently failing, so every booking was being rejected as 'tutor not available.' A unit test on the comparison helper would never have caught it; a real-DB integration test did."
>
> "CD: deploy.sh on a self-hosted runner, PM2 restart. Pushed to main → live in about a minute when the runner is up."

---

## Slide 8 — Use of AI (Design phases) (90 seconds)

> "AI use, mapped to the class assignments that introduced it."
>
> "AI-Assisted Data Model: I asked AI to translate my entity list into MariaDB DDL. The output was a draft. I added an index on reviews.flagged because the moderation queue needs it, sized password_hash at 255 chars to be safe across bcrypt versions, removed an average_rating cached column AI suggested adding to tutor_profiles — that would have been a stale-data bug — and added a CHECK constraint AI had skipped."
>
> "AI-Assisted API Design: AI gave me 24 endpoints. I cut to 21. I removed unnecessary DELETEs — admins reject pending applications, they don't delete tutors. I standardized on snake_case across all response fields. I renamed the application endpoint to scope it under the right resource."
>
> "Scaffold-with-AI: used the slide's prompt structure to generate the project skeleton, then wrote everything else by hand."
>
> "And boilerplate: AI sometimes drafted route file structures from endpoint descriptions, but I read every line and integrated them into my project's existing validation, error-handling, and middleware patterns."

---

## Slide 9 — Use of AI (bug catches) (60 seconds)

> "Where AI got it wrong."
>
> "The most important: the first version of GET /api/auth/me returned the entire user row, including the bcrypt password_hash. AI didn't flag it. I caught it in code review, added a sanitize-user helper, and pinned it with a test."
>
> "An early SQL string in the reviews route used template-literal interpolation directly into the WHERE clause. I switched it to parameterized placeholders before it ever ran. The class proposal called this out as a security requirement, so I am glad I checked."
>
> "AI used ESM import syntax in test files for a CommonJS project — the tests failed with a confusing error. AI used getByLabel in Playwright that didn't work because react-bootstrap doesn't auto-link Form.Label to Form.Control. AI's first /api/recommend route had no fallback path — would 500 if the OpenAI API key wasn't set. I added a deterministic ranking so the feature works regardless."
>
> "How I checked AI's output: browser preview after every UI change, curl tests after every backend route, and the 64 tests run in CI on every push."

---

## Slide 10 — Lessons (Technical) (45 seconds)

> "Six things 7 weeks of this stack taught me."
>
> "Express 5 is a real upgrade — the path-to-regexp change broke my catch-all regex and silently swallowed /api/health. MariaDB's TIME column type bit me — strict string comparison fails when one side has seconds and the other doesn't. Sessions for same-origin apps are simpler than JWT and more secure. Designing endpoints before coding them — what the AI-assisted assignment forced — was the single biggest time saver. And a real-DB CI service container catches bugs mocks hide."

---

## Slide 11 — Lessons (AI / Process) (45 seconds)

> "Five things working with AI taught me."
>
> "Constrain the prompt — say 'Express 5, mysql2, sessions, single-port' up front and the output stays in scope; leave it vague and AI invents Knex and JWT and a separate dev server."
>
> "Design first, code second."
>
> "Read every line — every bug on the previous slide was caught only because I reviewed the code, not because AI flagged it."
>
> "Tests are how you trust the AI on the next change."
>
> "And finally: I am the engineer. AI is one tool alongside docs and Stack Overflow. The decisions are mine."

---

## Slide 12 — Demo Intro (10 seconds, then switch to live app)

> "OK — let me show you the running app."

**Switch to the browser tab with `http://10.192.145.179:4131` open.**

---

## Live demo (≈4 minutes)

If the live runner is unstable, use the LOCAL preview at `http://localhost:4131` instead — has identical seed data.

**Step 1 (45s) — Sign in as student**
- Go to `/login`. Fill `alex.smith@kenyon.edu` / `student123`. Click Sign in.
- *Say:* "I'm signed in as Alex, a student. Dashboard shows my upcoming and past sessions, and on the right is the AI tutor matching widget — I'll come back to that."

**Step 2 (60s) — Find a tutor → book a session**
- Click "Find a Tutor" in the nav.
- Click the Subject filter, pick "Calculus I" — *say:* "Filters by subject, day of week, minimum rating."
- Click on Marcus Wong's card.
- *Say:* "Tutor profile — bio, subjects he teaches, weekly availability, reviews."
- Click "Request session." In the modal, pick a date that's a Tuesday or Thursday (when Marcus is available), 13:00 to 14:00, subject Calculus I, location "Math Center", note "Going over related rates", Submit.
- *Toast appears: "Request sent to Marcus!"*
- *Say:* "The booking just enforced six rules server-side — date in the future, time within his Tuesday availability, no conflict, he teaches the subject, I'm not him, valid times."

**Step 3 (60s) — Switch to tutor → confirm + complete**
- Open the user dropdown top-right → Sign out.
- Sign in as `marcus.wong@kenyon.edu` / `tutor123`.
- *Say:* "Tutor dashboard — pending requests at the top. Here's the one Alex just sent."
- Click Confirm. Toast: "Session confirmed."
- Click "Mark completed" on the now-confirmed session. Toast: "Session marked completed."

**Step 4 (45s) — Switch back to student → leave review**
- Sign out. Sign in as Alex again.
- Go to dashboard. Past sessions section now shows the completed Calc session with "Awaiting your review" highlighted.
- Click into the session → leave a 5-star review with a short comment. Toast: "Thanks for your review!"

**Step 5 (60s) — Switch to admin**
- Sign out. Sign in as `admin@kenyon.edu` / `admin123`.
- *Say:* "Admin dashboard — total users, approved tutors, pending applications, sessions this week, average rating, flagged reviews."
- Click "Review moderation" tab — *say:* "Alex's review just appeared here."
- Click "Pending applications" tab — *say:* "Ravi Shah applied to tutor Physics. I can approve or reject. Approve."
- Click "Subjects" tab — *say:* "Admins can add subjects too."
- Click "Popular subjects" tab — *say:* "Bar chart of the most-requested subjects, scaled by booking count."

**Step 6 (15s) — AI recommendation (bonus if time)**
- Sign out, back in as Alex. On dashboard, in the AI tutor matching widget, pick "Calculus I", click Recommend.
- *Say:* "AI ranks tutors with reasons. Falls back to a deterministic ranking if there's no API key — works for whoever runs the project."

---

## Q&A

If asked about something you didn't have time to cover, point at the right doc:

- **"How big is the project?"** ~25 endpoints, 11 frontend pages, 7 tables, 64 tests, ~10K lines (probably).
- **"Can I see the test results?"** Open `github.com/calvindeka/TutorConnect/actions` — green CI badge in the README.
- **"How does the AI recommendation work?"** OpenAI gpt-4o-mini if the key is set. Otherwise a deterministic score: rating × 2 + log(sessions+1) + a small bonus for availability slots. Always returns 3 candidates with one-sentence reasons. The response includes `source: "ai" | "fallback"`.
- **"How long did this take?"** 7 weeks, project plan → data model → API design → scaffold → auth → CI → CD → final.
- **"Why sessions, not JWT?"** Auth assignment said no JWT requirement. Same-origin app, so a session cookie is simpler and more secure than a JWT in localStorage.
- **"What would you do differently?"** Tests that pin the auth response shape from day one. A `CLAUDE.md` with architectural constraints up front to keep AI from drifting. Per-test database isolation set up earlier.

## Backup if something breaks during demo

- **Live URL down**: switch to `http://localhost:4131` in another tab — same data.
- **Browser tab logged in as wrong user**: use the user dropdown → Sign out, then sign in as the right user.
- **Booking modal won't accept the time**: pick a date that's a Tuesday or Thursday (Marcus's availability), or pick "Friday" + Jane Doe's slot.
- **AI recommend returns empty**: there are only 4 approved tutors — pick a subject any of them teaches. Calc I, Intro CS, Organic Chem, Microeconomics all have a tutor.
