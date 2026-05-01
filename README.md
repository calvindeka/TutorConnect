# TutorConnect

[![CI](https://github.com/calvindeka/TutorConnect/actions/workflows/ci.yml/badge.svg)](https://github.com/calvindeka/TutorConnect/actions/workflows/ci.yml)

A peer tutoring platform for Kenyon College students.
**Final project — SCMP/COMP 318, Spring 2026 — Calvin Deka**

Live: <http://10.192.145.179:4131>

---

## 1. Project Overview

**Purpose.** TutorConnect is a web platform that connects Kenyon students who need academic help with qualified peer tutors. The goal is to replace ad-hoc messaging and word-of-mouth referrals with a single, quality-controlled place to find tutors, book sessions, and leave reviews.

**Intended users.**
- **Students** — search for tutors, request sessions, leave reviews after.
- **Tutors** — apply to tutor, set weekly availability, accept/decline session requests, mark them complete.
- **Admins** — approve or reject tutor applications, moderate reviews, and view platform stats.

**Main features.**
- Account creation and password-based login with persistent server-side sessions.
- Tutor application workflow with admin approval (pending → approved/rejected).
- Search and filter tutors by subject, rating, availability, and free-text query.
- Session booking with conflict detection (request → confirmed → completed/cancelled).
- 1–5 star reviews tied to completed sessions, with admin moderation/flagging.
- Admin dashboard with platform stats and a moderation queue.
- AI-assisted tutor recommendation per subject (with deterministic fallback when no API key is set).

**Problem it solves.** Students currently rely on word of mouth or scattered group chats to find tutors. Tutors get inconsistent demand and have no clean way to publish availability. There is no quality control or feedback loop. TutorConnect centralizes this with a verified tutor pool and a review system.

---

## 2. How to Use the Application

### Test accounts (seeded by `npm run db:seed`)

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@kenyon.edu` | `admin123` |
| Student | `alex.smith@kenyon.edu` | `student123` |
| Student | `jordan.lee@kenyon.edu` | `student123` |
| Tutor | `jane.doe@kenyon.edu` | `tutor123` |
| Tutor | `marcus.wong@kenyon.edu` | `tutor123` |
| Tutor | `priya.patel@kenyon.edu` | `tutor123` |
| Pending tutor (still a student) | `ravi.shah@kenyon.edu` | `tutor123` |

### What each page does

- `/` — marketing landing page.
- `/login`, `/register` — auth.
- `/dashboard` — role-aware dashboard:
  - **Student dashboard**: upcoming and past sessions, "awaiting your review" count, AI tutor recommendations.
  - **Tutor dashboard**: pending requests with confirm/decline buttons, upcoming confirmed sessions with "mark completed", past sessions.
  - **Admin dashboard**: platform-wide stats, pending tutor applications, review moderation queue, popular subjects.
- `/tutors` — search/filter approved tutors by subject, day, rating, free-text.
- `/tutors/:id` — tutor profile (bio, subjects, weekly availability, reviews) + "Request session" button.
- `/sessions/:id` — session detail. From here a student can leave a review on a completed session, or either party can update status (confirm/complete/cancel) per the state machine.
- `/apply` — students submit a tutor application (bio, GPA, subjects).
- `/availability` — approved tutors set their weekly availability slots.
- `/admin` — admin dashboard (alias for admin role's `/dashboard`).

### A typical workflow

1. **Sign in** as `alex.smith@kenyon.edu` (student).
2. Click **Find a Tutor**, filter by subject (e.g. "Calculus I").
3. Open Marcus Wong's profile → click **Request session**, pick a date/time within his availability, send.
4. **Sign out**, sign in as `marcus.wong@kenyon.edu` (tutor) → see the request in his dashboard → **Confirm**.
5. Mark the session **Completed**.
6. Sign back in as Alex → open the session → **leave a review**.
7. Sign in as `admin@kenyon.edu` → see the new review in the moderation queue, see updated stats.

---

## 3. How to Install and Run

### Prerequisites

- Node.js 20+ and npm
- MariaDB or MySQL 8+ running locally (or accessible via env vars)
- (Optional) an OpenAI API key for AI recommendations — there is a deterministic fallback if you don't have one

### Install dependencies

```bash
# from the repo root
cd client && npm install
cd ../server && npm install
```

### Configure environment

Copy `server/.env.example` to `server/.env` and fill in your DB credentials:

```env
PORT=4131
HOST=0.0.0.0
ADVERTISED_IP=10.192.145.179
SESSION_SECRET=change-me

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=tutorconnect

# Optional — enables AI recommendations
OPENAI_API_KEY=
```

### Create + seed the database

```bash
cd server
mysql -u "$DB_USER" -p"$DB_PASSWORD" < schema.sql   # creates DB + tables
node scripts/seed.js                                 # creates the test accounts above
```

### Build the frontend (single-port architecture — Express serves the React build)

```bash
cd client
npm run build
```

### Start the server

```bash
cd server
npm start              # plain
# or, in production:
pm2 start index.js --name tutorconnect
pm2 save
```

Visit <http://10.192.145.179:4131> (or `http://localhost:4131` locally).

### Run the tests

```bash
cd server && npm test       # 11 unit + integration tests (Vitest + Supertest)
cd client && npm test       # 9 component tests (Vitest + React Testing Library)
npx playwright test         # 3 end-to-end tests (Playwright)
```

---

## 4. Architecture

Single-port architecture, per the scaffolding spec:

```
Browser ─▶ Express server (port 4131)
              ├─ /api/*  → JSON API routes
              └─ /*      → static files from client/dist (React SPA)
```

- **Frontend**: React 19 + Vite, React Router 7, React Bootstrap 2, Bootstrap Icons. Built once with `npm run build` and served by Express. There is **no separate frontend dev server** in production.
- **Backend**: Node.js + Express 5, `express-session` for sessions (signed httpOnly cookies, no JWT — the auth assignment explicitly says no JWT requirement), `express-validator` for input validation, `bcrypt` for password hashing.
- **Database**: MariaDB / MySQL via `mysql2` driver with parameterized queries (no string concatenation).
- **AI**: OpenAI `gpt-4o-mini` for tutor recommendations, with a deterministic ranking fallback when the API key is not set.

---

## 5. Database Schema

7 tables. See `server/schema.sql` for the canonical SQL.

### `users`
All accounts. The `role` column distinguishes students, tutors, and admins.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | INT PK | auto-increment |
| `email` | VARCHAR(255) UNIQUE NOT NULL | login identifier |
| `password_hash` | VARCHAR(255) NOT NULL | bcrypt |
| `first_name`, `last_name` | VARCHAR(100) NOT NULL | |
| `role` | ENUM('student','tutor','admin') | default `'student'` |
| `profile_image_url` | VARCHAR(500) | optional |
| `created_at`, `updated_at` | TIMESTAMP | |

### `tutor_profiles`
Extended profile for users who apply to tutor. `user_id` is UNIQUE → one-to-one with `users`.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | INT PK | |
| `user_id` | INT FK → `users(id)` UNIQUE | CASCADE DELETE |
| `bio` | TEXT | |
| `status` | ENUM('pending','approved','rejected') | drives admin approval workflow |
| `gpa` | DECIMAL(3,2) | optional |
| `created_at` | TIMESTAMP | |

### `subjects`
Lookup table (Calculus I, Intro CS, etc.) with `category`. Seeded; admin can add more.

### `tutor_subjects`
Junction for the many-to-many between `tutor_profiles` and `subjects`. Composite UNIQUE on `(tutor_profile_id, subject_id)`.

### `availability`
Weekly recurring slots: `(tutor_profile_id, day_of_week ENUM, start_time TIME, end_time TIME)`. Used for filtering tutors by day and validating session bookings.

### `sessions`
The core workflow table.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | INT PK | |
| `student_id` | INT FK → `users(id)` | the student who booked |
| `tutor_profile_id` | INT FK → `tutor_profiles(id)` | the tutor |
| `subject_id` | INT FK → `subjects(id)` | |
| `session_date` | DATE | |
| `start_time`, `end_time` | TIME | |
| `status` | ENUM('requested','confirmed','completed','cancelled') | state machine |
| `location` | VARCHAR(255) | optional |
| `notes` | TEXT | student's request details |

### `reviews`
One review per completed session — `session_id` is UNIQUE.

| Column | Type | Notes |
| --- | --- | --- |
| `session_id` | INT FK → `sessions(id)` UNIQUE | one-to-one |
| `student_id` | INT FK → `users(id)` | the reviewer |
| `tutor_profile_id` | INT FK → `tutor_profiles(id)` | the reviewed tutor |
| `rating` | INT (CHECK 1–5) | 1-5 stars |
| `comment` | TEXT | optional |
| `flagged` | BOOLEAN default FALSE | admin moderation |

### Relationships at a glance

- `users` 1—1 `tutor_profiles` (a user has at most one tutor profile)
- `tutor_profiles` *—* `subjects` via `tutor_subjects`
- `tutor_profiles` 1—* `availability`
- `users` (as student) 1—* `sessions`; `tutor_profiles` 1—* `sessions`; `subjects` 1—* `sessions`
- `sessions` 1—1 `reviews`

---

## 6. API Documentation

All API routes live under `/api/`. Auth is session-based — a successful `/api/auth/login` sets an httpOnly cookie, and subsequent requests must include it (`withCredentials: true` on the client). Protected routes return `401` when no session is present and `403` when the role is wrong.

### Auth

| Method | Path | Purpose | Body | Auth |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/register` | Create a new student account | `{ email, password, first_name, last_name }` | Public |
| POST | `/api/auth/login` | Sign in | `{ email, password }` | Public |
| POST | `/api/auth/logout` | Destroy session | none | Any |
| GET | `/api/auth/me` | Current user (incl. tutor profile if any) | none | Authenticated |

### Tutors

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| GET | `/api/tutors?subject=...&min_rating=...&day=...&q=...&sort_by=rating\|sessions&page=&limit=` | List approved tutors with filters; includes computed `avg_rating`, `review_count`, `total_sessions` | Any auth |
| GET | `/api/tutors/:id` | Full tutor profile (subjects + availability) | Any auth |
| POST | `/api/tutors/apply` | Student submits tutor application: `{ bio, gpa?, subject_ids[] }` | Authenticated |
| PUT | `/api/tutors/:id` | Tutor updates own bio/GPA | Tutor (own) |
| GET | `/api/tutors/admin/pending` | List pending applications | Admin |
| PATCH | `/api/tutors/:id/status` | Approve or reject application: `{ status: 'approved'\|'rejected' }` (also flips `users.role` to `'tutor'` on approve) | Admin |

### Subjects

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| GET | `/api/subjects` | List all subjects | Any auth |
| POST | `/api/subjects` | Add a subject: `{ name, category }` | Admin |

### Availability

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| GET | `/api/availability/:tutorProfileId` | Get a tutor's weekly slots | Any auth |
| PUT | `/api/availability` | Replace own slots: `{ slots: [{ day_of_week, start_time, end_time }] }` | Tutor |

### Sessions

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| POST | `/api/sessions` | Request a session: `{ tutor_profile_id, subject_id, session_date, start_time, end_time, location?, notes? }`. Validates: tutor approved, subject they teach, date today/future, fits availability, no conflicting session. | Authenticated |
| GET | `/api/sessions?status=` | List sessions for current user (auto-filtered by role) | Authenticated |
| GET | `/api/sessions/:id` | Session detail (involved student or tutor, or admin) | Authenticated |
| PATCH | `/api/sessions/:id/status` | Update status: `{ status: 'confirmed'\|'completed'\|'cancelled' }`. Server enforces valid transitions and who can perform each. | Authenticated |

### Reviews

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| POST | `/api/reviews` | Leave a review for a completed session: `{ session_id, rating: 1-5, comment? }` | Student in session |
| GET | `/api/reviews/:tutorProfileId` | Public reviews for a tutor (excludes flagged) + avg + total | Any auth |
| GET | `/api/reviews/admin/all` | All reviews (moderation queue) | Admin |
| PATCH | `/api/reviews/:id/flag` | Toggle flagged: `{ flagged: bool }` | Admin |

### Dashboard / AI

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| GET | `/api/dashboard/stats` | Platform stats: users, tutors, pending apps, sessions, avg rating, popular subjects, flagged reviews | Admin |
| GET | `/api/recommend?subject_id=N` | AI-ranked tutor recommendations with reasons. Falls back to deterministic ranking if `OPENAI_API_KEY` is unset. | Authenticated |

### Health

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | `{ status: "ok", timestamp }` (used by CI smoke test) |

### Example: `GET /api/tutors`

```json
{
  "tutors": [
    {
      "id": 1,
      "user_id": 5,
      "first_name": "Jane",
      "last_name": "Doe",
      "bio": "Junior CS major, 3.85 GPA…",
      "gpa": "3.85",
      "avg_rating": 5,
      "review_count": 1,
      "total_sessions": 1,
      "subjects": [
        { "id": 6, "name": "Intro to Computer Science", "category": "Computer Science" },
        { "id": 7, "name": "Data Structures", "category": "Computer Science" }
      ]
    }
  ],
  "page": 1,
  "limit": 20
}
```

---

## 7. CI / CD

- **CI** (`.github/workflows/ci.yml`) runs on every push and PR to `main`. Installs both packages, runs the backend and frontend test suites, and verifies the production build still works.
- **CD** (`.github/workflows/cd.yml`) triggers after a successful CI run on `main` and uses a **self-hosted GitHub Actions runner** on the Kenyon server (the server is behind a firewall, so cloud runners can't SSH in). The runner executes `deploy.sh`, which pulls the latest commit, rebuilds the React frontend, reinstalls server deps, and `pm2 restart`s the app.
- **PM2** keeps the Express process alive across restarts. Process name: `tutorconnect`.

---

## 8. Project Structure

```
TutorConnect/
├── client/                         # React (Vite) frontend
│   └── src/
│       ├── App.jsx                 # Router + role-aware route guards
│       ├── api.js                  # Axios client
│       ├── context/AuthContext.jsx # session-based auth state
│       ├── components/             # NavBar, Layout, StarRating
│       ├── pages/                  # Home, Login, Register, Dashboard,
│       │                             TutorSearch, TutorProfile, Apply,
│       │                             Availability, SessionDetail, Admin
│       └── test/                   # Vitest + RTL tests
├── server/                         # Express backend
│   ├── app.js                      # Express app (importable for tests)
│   ├── index.js                    # listen()
│   ├── config/db.js                # mysql2 pool
│   ├── middleware/auth.js          # requireAuth, requireRole
│   ├── routes/                     # auth, tutors, subjects, availability,
│   │                                 sessions, reviews, dashboard, recommend
│   ├── utils/sessionRules.js       # pure logic (overlap, transitions)
│   ├── tests/                      # Vitest + Supertest tests
│   ├── scripts/seed.js             # seed test data
│   ├── schema.sql                  # MariaDB schema
│   └── .env.example
├── e2e/                            # Playwright end-to-end tests
├── deploy.sh                       # CD entry point (run by self-hosted runner)
├── .github/workflows/              # ci.yml, cd.yml
├── playwright.config.js
└── package.json                    # root: build, start, test:* scripts
```

---

## 9. AI Reflection

See `AI_REFLECTION.md`.
