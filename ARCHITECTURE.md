# Architecture

This document describes how TutorConnect is put together: the runtime layout, the request lifecycle, the auth model, the session-booking state machine, and the trade-offs that shaped each decision.

## 1. Runtime layout

TutorConnect uses the **single-port architecture** required by the course scaffolding spec:

```
Browser
   ↓
http://10.192.145.179:4131
   ↓
PM2 → Node.js → Express
                  ├── /api/*  → JSON API handlers
                  └── /*       → static files from client/dist (the React build)
                                 with SPA fallback to index.html
```

There is **no separate frontend dev server in production**. The React app is built once with `vite build` and the resulting static files are served by Express. This eliminates a class of CORS/cookie issues that come with a split origin model and matches how the rest of the class deploys.

### Why this is the right call here

- One process to manage with PM2.
- Sessions and cookies don't have to deal with cross-origin (everything is same-origin).
- A single port firewall rule covers the whole app.

### Why it would not scale forever

- The Express server is doing two jobs (static + API). For a high-traffic deployment, putting Nginx in front to serve static assets and cache them is the obvious next step.

## 2. Request lifecycle

```
POST /api/sessions
  │
  ▼
cors                           — sets Access-Control-* headers
express.json (1mb cap)         — parses JSON body
request logger                 — times the request, logs on response.finish
express-session                — reads tutorconnect.sid cookie, hydrates req.session
sessions router                — matches POST /api/sessions
  │
  ▼
requireAuth middleware         — 401 if no req.session.user, otherwise req.user = session.user
express-validator chain        — body shape: tutor_profile_id, subject_id, date, times, ...
handler                        — business logic (see §4)
  │
  ▼
res.json({ id, status })
  │
  ▼
request logger logs            "POST /api/sessions → 201 (12ms)"
```

If no API route matches, an `app.use("/api", ...)` middleware returns `404 {"error":"Not found"}`. If the path is non-API, `express.static` tries to serve a file from `client/dist`; if that misses, the SPA fallback returns `index.html` so React Router can take over.

> The catch-all used to be `app.get(/.*/, ...)` which worked in Express 4 but Express 5's path-to-regexp interprets it differently and was swallowing `/api/health`. We replaced it with a clean `app.use("/api", 404)` ahead of the static handler — see commit history.

## 3. Authentication and authorization

We use **server-side sessions** via `express-session`, not JWT. Three reasons:

1. The auth assignment explicitly says "no JWT requirement."
2. The Google Login lecture slides advocate the session pattern (`express-session` + `mysql2`).
3. With a single-origin architecture, an httpOnly cookie is the simplest, most secure option — no localStorage XSS exposure, no token-refresh dance.

### Middleware

- `requireAuth(req, res, next)` — 401 if no `req.session.user`, else attaches `req.user`.
- `requireRole(...roles)(req, res, next)` — 401 if no session, 403 if `req.session.user.role` is not in the allowed list.

### Password handling

- `bcrypt.hash(pw, 10)` on register.
- `bcrypt.compare` on login (constant-time, no timing attack).
- The bcrypt hash is **never** included in any API response — every response goes through a `sanitize(user)` helper. There is a Vitest test pinning this contract: any attempt to leak the hash will fail CI.

### Session storage

Default `MemoryStore` for now. This is acceptable because:

- We run a single PM2 process (no multi-instance load balancing).
- A restart drops sessions, but everyone just logs back in — fine for an MVP.

If we needed durability across restarts or multi-process scaling, swapping in `connect-redis` or `express-mysql-session` is a one-file change.

## 4. Session booking — the most interesting business logic

A booking is the heart of the app. It has to enforce:

1. **Tutor exists and is approved** (you can't book a pending or rejected tutor).
2. **Subject is one the tutor teaches** (you can't book Marcus for Organic Chemistry — he's a math tutor).
3. **Date is today or in the future** (no time travel).
4. **Time fits the tutor's published availability for that day-of-week** (their Tuesday 14:00–16:00 slot covers a 14:30–15:30 booking, but not a 13:00–15:00 booking that bleeds out).
5. **No conflict with another active session** (`requested` or `confirmed`) on that tutor on that date that overlaps the requested time window.
6. **Student isn't booking themselves** (the tutor's user_id can't equal the requesting user).

The pure helpers — `dayFromDate`, `overlaps`, `fitsAvailability`, `hasConflict`, `canTransition` — live in `server/utils/sessionRules.js`. They have **zero dependencies** so they can be unit-tested without spinning up Express or MariaDB. The route handler in `routes/sessions.js` does the DB lookups and then delegates the business rules to these helpers.

### State machine

```
                ┌─[student or tutor cancels]─┐
                ▼                            │
         ┌──────────┐  tutor confirms  ┌───────────┐  tutor completes  ┌───────────┐
─request─│requested │─────────────────▶│ confirmed │──────────────────▶│ completed │
         └──────────┘                  └───────────┘                   └───────────┘
                                              │
                                              └─[student or tutor cancels]─▶ cancelled
```

`completed` and `cancelled` are terminal — no further transitions. `canTransition(from, to, actor)` enforces all of this and is heavily unit-tested.

## 5. AI tutor recommendation with deterministic fallback

`/api/recommend?subject_id=N` returns up to 3 tutors with a one-sentence reason for each.

- If `OPENAI_API_KEY` is set, the route compresses the candidate tutor data into a small JSON blob, sends it to `gpt-4o-mini` with a structured prompt, parses the strict JSON response back, and re-attaches the actual tutor records.
- If the API key is unset OR the AI call throws, it falls back to a deterministic ranking: `score = avg_rating × 2 + log(sessions + 1) + min(2, slot_count × 0.2)`. This is intentionally close to what the AI would compute on its own and means the feature works for the grader without an API key.

The response includes `source: "ai" | "fallback"` so the UI can show a small badge indicating which path ran.

## 6. Database

7 tables, all FK-constrained, with indexes on the columns we filter by:

- `users(role)` — for admin lookups
- `tutor_profiles(status)` — for "show me approved tutors"
- `availability(tutor_profile_id, day_of_week)` — for "tutors free on Tuesday"
- `sessions(student_id), sessions(tutor_profile_id), sessions(status), sessions(session_date)` — for the dashboards
- `reviews(tutor_profile_id), reviews(flagged)` — for tutor profile rating computation

`reviews.session_id` is `UNIQUE` so the database itself enforces "one review per session."

Average tutor rating is **computed at query time**, not cached on `tutor_profiles`. With MVP-scale data (dozens of reviews per tutor) the JOIN is cheap. Caching would invite stale-rating bugs and a derived-column-out-of-sync class of problems.

See `server/schema.sql` for the canonical DDL and `server/scripts/seed.js` for sample data.

## 7. Testing strategy

Three layers, three runners, all wired into one CI workflow:

| Layer | Runner | What it tests | Where |
| --- | --- | --- | --- |
| Pure logic | Vitest | Session conflict math, state machine transitions, error message extraction | `server/tests/sessionRules.test.mjs`, `client/src/test/api.test.js` |
| HTTP / integration | Vitest + Supertest | Real Express app + real MariaDB (test database). Auth gating, validation, full tutor application workflow. | `server/tests/api.test.mjs` |
| UI components | Vitest + React Testing Library + jsdom | Star rating, marketing page, error message helper | `client/src/test/*.test.jsx` |
| End-to-end | Playwright (Chromium) | Real browser hitting the running app: hero loads, login flow, logout flow, health endpoint | `e2e/smoke.spec.js` |

The CI workflow spins up a real MariaDB 10.11 service container and loads the schema before running tests, so the integration tests are exercising actual SQL paths and bcrypt password verification — not mocks.

## 8. CI / CD

```
push to main
   │
   ▼
GitHub Actions: CI workflow
   ├── start MariaDB 10.11 service
   ├── load schema.sql into tutorconnect_test
   ├── npm ci + vitest run (server)
   ├── npm ci + vitest run (client)
   └── vite build (verify production build still works)
   │
   ▼ (only if CI green AND branch is main)
GitHub Actions: CD workflow
   └── runs on a self-hosted runner inside the Kenyon firewall
       └── ssh-free deploy.sh
            ├── git fetch + reset --hard origin/main
            ├── npm install (root, client, server)
            ├── vite build
            └── pm2 restart tutorconnect
```

The self-hosted runner pattern is required because the deploy server (`10.192.145.179`) sits behind the Kenyon campus firewall — GitHub-hosted runners cannot SSH in. A self-hosted runner installed on the server itself sidesteps this entirely.

## 9. Trade-offs and what we'd do differently with more time

- **Sessions in MemoryStore.** Single-process is fine for MVP. Production would use Redis-backed sessions.
- **No file uploads.** Tutor avatars are URLs only. A real product would use S3 + signed URLs.
- **No notifications.** Students refresh their dashboard to see status changes. Real product needs at least email + ideally web push.
- **No pagination on tutor list.** With ~5 tutors in the seed data this is fine. A scaling fix would add cursor pagination on the `GET /api/tutors` endpoint.
- **`PUT` (full replace) for availability.** Simpler than partial updates, slightly more data over the wire. Would switch to PATCH if availability got large or had per-slot exception handling.
- **Conflict detection is application-side.** A PostgreSQL EXCLUDE constraint or a stored procedure would push it down into the DB. For MVP, the trade-off is clearer error messages and easier debugging.
