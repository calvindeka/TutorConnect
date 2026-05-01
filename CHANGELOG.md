# Changelog

This is a chronological log of how TutorConnect was built. Each entry corresponds to one or more commits in `git log`.

## Foundation (early in the term)

- **Scaffold the app.** Generated the basic full-stack scaffold per the course spec: React (Vite) frontend, Node.js + Express backend, MariaDB. Single-port architecture — Express serves the React build from `client/dist`.
- **Configure the deployment server.** Set up port `4131` (the assigned `41xx` port for student ID `31`), exposed via `ADVERTISED_IP=10.192.145.179`. Wired up MariaDB connection pooling.
- **Routing and SPA fallback.** Got Express serving `/api/*` routes alongside the static React build with an index.html catch-all.

## Authentication & sessions

- **Session-based auth with login/logout.** Implemented `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` (assignment 1's hard requirement). Sessions live in `express-session`'s default MemoryStore; cookie is httpOnly. The class explicitly said "no JWT requirement," so we deliberately stayed on sessions.
- **Real password-based register/login** with `bcrypt.hash` (10 rounds) on register and `bcrypt.compare` on login. The `/api/auth/me` response is sanitized to never leak `password_hash`.

## Schema and seed

- **7-table relational schema** in `server/schema.sql`: users, tutor_profiles, subjects, tutor_subjects, availability, sessions, reviews. Foreign keys with `CASCADE`/`RESTRICT` chosen per relationship semantics; indexes on every column we filter by.
- **Seed script** (`server/scripts/seed.js`) creates an admin, three students, four approved tutors with bios + GPAs + subjects + weekly availability, one *pending* tutor application (so the admin queue isn't empty), one completed past session with a 5-star review, one upcoming confirmed session, and one pending request.

## Resource APIs

- **Tutors:** `GET /api/tutors` with subject/day/min_rating/q/sort_by filters and computed `avg_rating` + `review_count` + `total_sessions`. `POST /api/tutors/apply` for student applications. `PATCH /api/tutors/:id/status` for admin approve/reject (also flips `users.role` to `'tutor'` on approve, in a transaction).
- **Subjects:** list + admin-create.
- **Availability:** `GET /api/availability/:tutorProfileId`, `PUT /api/availability` (full replace by the tutor).
- **Sessions:** `POST /api/sessions` with the full validation chain — tutor approved, subject they teach, date today/future, fits availability, no overlap with another active session, can't book yourself. State machine (requested → confirmed → completed/cancelled) enforced server-side.
- **Reviews:** `POST /api/reviews` requires the session to be completed and the requester to be the student. `UNIQUE` constraint on `session_id` makes one-review-per-session impossible to bypass. Admin moderation flag.
- **Dashboard stats** for admin (counts + averages + popular subjects + flagged reviews).
- **AI recommendations** with deterministic fallback: tries OpenAI `gpt-4o-mini` if `OPENAI_API_KEY` is set, otherwise scores tutors by `rating × 2 + log(sessions+1) + min(2, slot_count × 0.2)`. Response includes `source: "ai" | "fallback"`.

## React UI (Bootstrap)

- **Brand identity:** TutorConnect logo, gradient hero, Inter font, custom colors (`--tc-brand`, `--tc-brand-2`, `--tc-accent`).
- **Pages:** Home, Login, Register, role-aware Dashboard, Tutor Search (with filter row), Tutor Profile (with reviews + booking modal), Session Detail (with review form when completed), Apply (multi-subject picker), Availability (slot editor), Account Settings (profile + change password), Admin Dashboard (4 tabs: pending applications, review moderation with search, popular subjects bar chart, subject management).
- **Cross-cutting:** `Layout` + `NavBar` with role-aware menu items. `StarRating` and `StarPicker` components. `useToast()` hook for non-blocking success/error feedback.

## Bug fixes worth calling out

- **Express 5 routing:** the original catch-all `app.get(/.*/, ...)` swallowed `/api/health` because Express 5's path-to-regexp 8.x interprets regex routes differently. Replaced with a clean `app.use("/api", 404)` ahead of the SPA fallback.
- **HH:MM vs HH:MM:SS:** MariaDB returns `TIME` columns as `"14:00:00"` but `<input type="time">` and our test inputs are `"14:00"`. The string comparison silently failed, so every "valid" booking was being rejected as "Tutor is not available." Fixed by normalizing both sides via `slice(0, 5)` (and added a regression test).
- **Test isolation:** the integration tests share one MariaDB test database. Vitest config forces single-fork + non-parallel files, and a global teardown closes the pool exactly once.
- **Date timezone bug in test helper:** `nextTuesday()` was using `toISOString().slice(0,10)` which shifts to UTC and could roll over the day if "now" is near midnight. Switched to local-component formatting.

## CI / CD

- **GitHub Actions CI** (`.github/workflows/ci.yml`): on every push and PR to main, spin up a real **MariaDB 10.11 service container**, load `schema.sql`, run backend tests (Vitest + Supertest, hitting real SQL paths), run frontend tests (Vitest + React Testing Library), and verify `vite build` still produces a clean bundle. Status badge in the README.
- **GitHub Actions CD** (`.github/workflows/cd.yml`): triggers after successful CI on main, runs on a self-hosted runner inside the Kenyon firewall (the deploy server is firewalled — cloud runners can't SSH in), executes `deploy.sh`.
- **`deploy.sh`**: `git pull` → `npm install` → `vite build` → `pm2 restart tutorconnect`. PM2 keeps the Express process alive across server restarts.

## Tests

| Layer | Runner | Count |
| --- | --- | --- |
| Pure-logic unit | Vitest | 6 (session rules + state machine) |
| HTTP / integration | Vitest + Supertest + real MariaDB | 38 (auth, tutor application workflow, booking validation, status transitions, reviews, availability) |
| UI components | Vitest + React Testing Library | 12 (StarRating, errorMessage helper, HomePage, NavBar, Toaster) |
| End-to-end | Playwright (Chromium) | 8 (hero loads, login flow, logout, bad creds error, admin dashboard, session persistence, tutor search, profile page) |

## Polish pass

- **Toast notifications** (`Toaster.jsx`): global success/error pop-ups in the top-right after every action, replacing inline alerts that the user might miss.
- **Account settings** at `/settings`: edit name, change password (current-password verification required to prevent session-hijack-to-permanent-takeover).
- **Admin dashboard polish:** warning-bordered stat boxes when pending applications or flagged reviews are non-zero; review moderation search filter; popular-subjects bar chart with the brand gradient.
- **Subject management** for admins via UI (was API-only).
- **Empty states** with friendly messaging and icons across the dashboards.
