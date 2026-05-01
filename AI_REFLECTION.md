# AI Reflection — TutorConnect

Calvin Deka · SCMP 318 · April 2026

I built TutorConnect with heavy AI assistance, primarily Claude. This reflection is an honest account of how I used it, where it actually helped, where it failed me, and how I learned to keep it on a useful leash. I have tried to be specific — generalizations like "AI made me faster" are easy to write and tell you nothing.

## Where AI was genuinely helpful

**1. Translating my data model into a real working schema.**
My data-model assignment had `tutor_profiles`, `subjects`, `tutor_subjects`, `availability`, `sessions`, `reviews`, etc., laid out conceptually. Asking the AI to turn it into MariaDB DDL with the right `ENUM` values, `FOREIGN KEY` clauses, `ON DELETE` behavior, and indexes was a clear win — that is mechanical translation work where the AI is fast and correct. I still made meaningful edits: I added an index on `reviews.flagged`, changed `password_hash` to `VARCHAR(255)`, removed an `average_rating` column the AI suggested caching on `tutor_profiles` (computing it at query time avoids stale-data bugs), and added an explicit `CHECK (rating BETWEEN 1 AND 5)`.

**2. Boilerplate Express route scaffolding.**
For each resource (tutors, subjects, availability, sessions, reviews) I described the endpoint shape and asked for a route file. I'd then read every line, fix anything wrong, and integrate the validation/middleware/error handling pieces that already existed in my project. This was much faster than typing the boilerplate from scratch, but I had to fix mistakes (described below) on almost every file.

**3. UI scaffolding with React Bootstrap.**
I knew the components I wanted on each page (a search filter row, a tutor card grid, a session row component, a star picker) but I am not very fast at writing React+Bootstrap markup. The AI got me to a working layout quickly; I then iterated visually in the browser and tightened spacing, copy, and the few interactions that needed real thought (e.g. the booking modal, role-aware nav).

## Where AI made mistakes I had to catch

**1. It silently put `password_hash` in the `/api/auth/me` response.**
This is the single most important catch. The first version of the auth route returned the full user row, including the bcrypt hash. The AI didn't flag it as a problem. I caught it during code review and added a `sanitize(user)` helper. The lesson here is durable: AI follows the path of least resistance, and "spread the row I just got from the database into the response" is exactly that path. I now read every API response shape myself before trusting it.

**2. It tried to use ESM `import` in a CommonJS Express project.**
When I asked for tests, the first draft used `import { describe, it, expect } from "vitest"` even though `server/package.json` has `"type": "commonjs"`. The tests failed with a confusing "Vitest cannot be imported in a CommonJS module using require()" error. The fix was to rename the test files to `.mjs` and use `createRequire(import.meta.url)` to bridge to the CJS modules under test. The AI's answer had been syntactically reasonable but contextually wrong because it didn't notice my package's module type.

**3. It generated a prompt-injection-shaped review-fetching SQL.**
An early version of the review listing query interpolated the tutor ID directly into the SQL string (`WHERE tutor_profile_id = ${id}`). I was alert to this and replaced it with a parameterized `?` query. This is exactly the kind of vulnerability that turns "AI helped me move faster" into "AI helped me ship a SQL injection." The class proposal explicitly called out parameterized queries as a security requirement, so I am glad I checked.

**4. It used label-based Playwright queries that didn't work with React Bootstrap.**
The AI wrote `page.getByLabel("Email").fill(...)`, but React Bootstrap's `Form.Group` doesn't auto-link `Form.Label` to `Form.Control` unless you set `controlId`. The test timed out. Switching to placeholder-based queries (`getByPlaceholder("you@kenyon.edu")`) fixed it. The AI doesn't know what gets rendered to the DOM versus what the JSX looks like — only running the test does.

**5. It tried to be too clever with the AI recommendation prompt.**
The first version of `/api/recommend` made an OpenAI call with no fallback. If the API key was unset (which it is in the grader's environment), the entire feature would 500. I rewrote it so that the deterministic ranking — `rating * 2 + log(sessions+1) + min(2, slot_count*0.2)` — is the default, and OpenAI is only used when `OPENAI_API_KEY` is set. The recommendation feature works for whoever runs the project, with or without an API key.

## How I checked / corrected AI-generated code

I leaned on three habits:

1. **Browser preview after every meaningful UI change.** Once I had Express serving the React build, I kept the preview open and clicked through the app constantly. This is how I caught a missing `/admin` route (the nav linked to `/admin` but I had only defined `/dashboard` — the catch-all redirected to `/`), how I noticed the booking modal needed time validation, and how I confirmed the role-aware dashboards rendered the right thing for the right user.
2. **`curl`/Supertest smoke tests at every backend milestone.** After each new route, I ran `curl` against it — login, list tutors, recommend, dashboard stats. This caught the `/api/auth/me` returning `password_hash` and several response-shape mismatches (e.g. `gpa` came back as a string `"3.85"` instead of a number, which I left as-is and just handled in the React rendering with `Number(...)`).
3. **Tests as a contract.** The Vitest unit tests on `sessionRules.js` (overlap detection, availability fit, state machine transitions) catch any regression on the most subtle business logic. The Supertest integration tests confirm that auth gating actually returns 401 when it should. The Playwright tests confirm a real student can really log in. None of these tests are exhaustive — but together they pin down behavior the AI is most likely to subtly drift from on the next change.

## What I learned about guiding AI effectively

- **Constrain the prompt before generating code.** When I asked "design the auth flow first, no code yet," the AI produced a clean session-based design that fit my existing scaffold. When I skipped that step on the recommend endpoint and just asked for code, it added an OpenAI call without a fallback, which would have broken the demo for anyone without an API key.
- **Tell it what you have already chosen.** When I wrote out "Express 5, mysql2, express-session, no JWT, single-port architecture per the scaffold spec," the output stayed in scope. When I left things vague, it would invent things — Knex, JWT middleware, separate frontend dev server — that conflicted with the rest of the project.
- **Read every file before integrating it.** Most of the bugs above were not subtle, just easy to miss when accepting code wholesale. A 30-second read pays for itself.

## What I learned about my own role

I'm the project manager, the architect, and the integrator. The AI is a very fast typist with broad pattern knowledge but no judgment about my project's specifics. Every meaningful decision — what tables to keep, what to cut from the MVP, how to structure the session state machine, when "good enough" is good enough — has to be mine. The work shifted from typing to deciding and verifying.

The flip side is real: I was able to deliver a substantially larger, more polished application in one focused day than I could have without AI. The platform has 7 tables, ~25 API endpoints, 9 frontend pages, role-based auth, an AI feature with a fallback, 23 passing tests, and a CI/CD pipeline. That scope is only feasible because the AI handles the typing and I handle the thinking.

## What I would do differently next time

1. **Write the test for the auth response shape on day one.** A test asserting that `password_hash` is *never* in any `/api/*` response would have caught my biggest bug at the moment it appeared, not later.
2. **Lock the architectural constraints in `CLAUDE.md` (or its equivalent).** I had to repeat "no separate frontend server, sessions not JWT, mysql2 not Knex" multiple times across prompts. A single source of truth would have kept the AI from drifting.
3. **Set up the database test isolation earlier.** Right now my Vitest backend tests intentionally avoid touching the DB so they're stable. A proper test database with per-test rollbacks would let me write much higher-fidelity integration tests for the booking flow (which is where most of the real business-logic risk lives).
4. **Stop earlier and integrate.** I caught myself a few times asking for one more route or one more page before testing what I already had. The faster I get to "running app I can click through," the faster I find what's actually wrong.
