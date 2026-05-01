# AI Reflection — TutorConnect

Calvin Deka · COMP 318 · May 2026

This semester the class introduced AI as a tool at specific points in the development process — the AI-assisted Project Plan, the AI-assisted Data Model, the AI-assisted API Design, and the Scaffold-App-With-AI exercise. My reflection follows the same arc: where I used AI, what I changed about its output, and what I learned about being the engineer in the room when the AI is generating code.

## How I used AI during the project

I used AI deliberately, mostly at the design-and-scaffolding phases the class structured around it, and occasionally to speed up boilerplate. I did not use AI to think for me — every architectural choice (sessions vs. JWT, single-port serving the React build, the seven-table schema, the booking state machine) was mine to make and defend.

**During the AI-assisted Data Model assignment**, I started from my user stories and asked AI to help translate the entities I had identified into a MariaDB schema with the right `ENUM` values, foreign-key cascades, and indexes. I treated the AI's output as a draft, not the answer. I added an index on `reviews.flagged` because the moderation queue would need it, sized `password_hash` at `VARCHAR(255)` to be safe across bcrypt versions, and removed an `average_rating` cached column the AI suggested adding to `tutor_profiles` because computing it at query time avoids stale-data bugs. I added a `CHECK (rating BETWEEN 1 AND 5)` constraint the AI had skipped.

**During the AI-assisted API Design assignment**, I used AI to help me move from my data model into a REST endpoint list. The AI's first pass produced 24 endpoints; I cut it to 21 by removing a `DELETE /api/tutors/:id` (admins reject pending applications, they don't delete tutors), a `PUT /api/subjects/:id` (subjects don't need editing for MVP), and a `DELETE /api/reviews/:id` (admin moderation flags rather than deletes — softer, recoverable). I renamed `POST /api/tutor-applications` to `POST /api/tutors/apply` because it scoped better under the resource. The validation rules and the session-booking conflict logic I wrote myself, because the business logic was where the real risk lived.

**During the Scaffold-App-With-AI step**, I used the prompt structure from the slides to generate the project skeleton — React + Vite frontend, Express backend, single-port architecture serving `client/dist`. From there everything was hand-written and reviewed: the routes, the middleware, the React pages, the database queries.

**For boilerplate during implementation**, I sometimes asked AI to draft a route file's structure given an endpoint description, then I integrated the project's existing validation chain, error handling, and middleware patterns by hand. This was faster than typing the boilerplate myself, but I read every line before keeping it.

## Where AI was helpful

- **Translating a designed schema into DDL.** Once I had the data model on paper, getting AI to render it in MariaDB syntax with the right constraints saved me an evening of typing and looking up correct `ON DELETE` syntax.
- **Generating example request/response JSON for the API design doc.** The endpoint list was mine; the AI helping me draft consistent example bodies kept the document readable.
- **Catching naming inconsistency.** When I asked AI to review my API design, it noticed I had mixed `camelCase` and `snake_case` in response fields. I standardized on `snake_case` everywhere.
- **Bootstrap component lookups.** Rather than dig through react-bootstrap docs for the right prop name, I'd ask AI for a quick example, then adapt it.

## Where AI made mistakes I had to catch

The rubric asks me to be specific, so:

1. **The first version of `GET /api/auth/me` returned the entire user row, including `password_hash`.** I caught this on review, added a `sanitize(user)` helper, and wrote a test pinning that the bcrypt hash never appears in any API response. This is the bug I'm proudest of catching, because it's the kind of thing that ships.
2. **An early SQL string interpolated `${id}` directly into the query** in a draft of the reviews route. I rewrote it to parameterized `?` placeholders before it ran. The class proposal called out parameterized queries as a security requirement, so I am glad I checked.
3. **AI suggested ESM `import` syntax in test files** even though my server is `"type": "commonjs"`. The tests failed with a confusing Vitest error. I switched the test files to `.mjs` and used `createRequire(import.meta.url)` to bridge to the CJS modules.
4. **AI used `getByLabel("Email")` in a Playwright test**, but react-bootstrap's `Form.Group` doesn't auto-link `Form.Label` to `Form.Control` unless you set `controlId`. The test timed out. Switching to `getByPlaceholder` fixed it. AI doesn't see what gets rendered — only running the test does.
5. **The first AI-recommend route had no fallback path.** If `OPENAI_API_KEY` isn't set, the whole feature 500s. I rewrote it so the deterministic ranking (`rating × 2 + log(sessions+1) + min(2, slot_count × 0.2)`) is the default, and OpenAI is only called when the key is present. The feature works for whoever runs the project.

## How I checked / corrected AI-generated code

Three habits did the heavy lifting:

1. **Browser preview after every meaningful UI change.** Once Express was serving the React build, I kept the preview open and clicked through the app constantly. This is how I caught a missing `/admin` route and confirmed the role-aware dashboards rendered the right thing for the right role.
2. **`curl` and Supertest smoke tests at every backend milestone.** After each new route, I `curl`ed it before moving on. This caught the `password_hash` leak and several response-shape issues.
3. **Tests as a contract.** 44 backend tests against a real MariaDB, 12 frontend component tests, 8 Playwright end-to-end tests — all running in CI. They catch the kind of subtle drift AI introduces when I refactor.

## What I learned about guiding AI effectively

- **Constrain the prompt before generating code.** When I told AI "Express 5, mysql2, express-session, no JWT, single-port architecture" up front, the output stayed in scope. When I left things vague, it would invent things — Knex, JWT middleware, separate frontend dev servers — that didn't fit my project.
- **Design first, code second.** This was the lesson Skon taught with the AI-assisted Data Model and API Design assignments. The week I spent on the schema and the API doc paid back in faster, cleaner implementation.
- **Read every line before integrating it.** The bugs above were not subtle — they were just easy to miss when accepting code wholesale. A 30-second read pays for itself.

## What I learned about my own role as the developer

I am the engineer. AI is a tool I reach for at specific points — the same way I reach for documentation, Stack Overflow, or the React-Bootstrap source — when it's the fastest way to get a draft I can refine. Every decision that shapes the project (what the schema looks like, what the state machine allows, where to draw the MVP line, what to test, how to deploy) is mine. The work I'm graded on is *my* work, even when AI helped me draft a piece of it.

The flip side: AI made it realistic to ship a substantially polished MVP — full tutor application workflow, session lifecycle with conflict detection, reviews, admin moderation, AI recommendations with a fallback, 64 tests across three layers, CI/CD with a real MariaDB service container — within the 7-week timeline. The class's framing ("AI as collaborator, you as the engineer") matches what I felt while building this.

## What I would do differently next time

1. **Write the test for the auth response shape on day one.** A test asserting that `password_hash` is *never* in any `/api/*` response would have caught my biggest bug at the moment it appeared, not on review.
2. **Lock the architectural constraints in a single source of truth.** I had to repeat "no separate frontend server, sessions not JWT, mysql2 not Knex" multiple times across prompts. Putting these in one place I could reference would have kept AI from drifting.
3. **Set up the test database earlier.** I avoided database-touching tests for too long because I didn't have a `tutorconnect_test` schema configured. Once I added it, I could write much higher-fidelity integration tests for the booking flow.
4. **Stop earlier and integrate.** I caught myself asking for one more route or one more page before testing what I already had. The faster I get to "running app I can click through," the faster I find what's actually wrong.
