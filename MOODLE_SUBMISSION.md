# TutorConnect — Moodle Submission

**Calvin Deka** · COMP/SCMP 318 Final Project · Spring 2026

---

## 1. GitHub Repository Link

**Repo:** <https://github.com/calvindeka/TutorConnect>

The repo includes:
- [README.md](README.md) — overview, install/run, schema, full API docs, CI badge
- [ARCHITECTURE.md](ARCHITECTURE.md) — runtime layout, request lifecycle, auth model, booking state machine, AI fallback, testing pyramid, CI/CD
- [CHANGELOG.md](CHANGELOG.md) — chronological log of how the project was built
- [AI_REFLECTION.md](AI_REFLECTION.md) — the required AI reflection essay
- [CD_SETUP.md](CD_SETUP.md) — deployment / runner notes

## 2. Live App

**URL:** <http://10.192.145.179:4131>

**Test accounts** (all real bcrypt-hashed passwords seeded by `server/scripts/seed.js`):

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@kenyon.edu` | `admin123` |
| Student | `alex.smith@kenyon.edu` | `student123` |
| Student | `jordan.lee@kenyon.edu` | `student123` |
| Student | `sam.wright@kenyon.edu` | `student123` |
| Tutor | `jane.doe@kenyon.edu` | `tutor123` |
| Tutor | `marcus.wong@kenyon.edu` | `tutor123` |
| Tutor | `priya.patel@kenyon.edu` | `tutor123` |
| Tutor | `tom.kelly@kenyon.edu` | `tutor123` |
| Pending tutor application | `ravi.shah@kenyon.edu` | `tutor123` |

## 3. Suggested grading walkthrough (5-minute demo)

1. Visit <http://10.192.145.179:4131>. The marketing landing page renders with the gradient hero.
2. Sign in as **Alex Smith** (student). Land on the student dashboard — see upcoming/past sessions, AI tutor recommendation widget on the right.
3. Click **Find a Tutor**. Filter by subject "Calculus I" → only Marcus Wong shows. Reset, click **Jane Doe**.
4. On Jane's profile, click **Request session**. Pick next Monday, 14:00–15:00 (matches her availability), submit. Toast: "Request sent to Jane!"
5. Sign out. Sign in as **Jane Doe** (tutor). See the request from Alex on her dashboard. Click **Confirm**. Mark **Completed**.
6. Sign back in as Alex. Open the session. Leave a 5-star review with a comment. Toast: "Thanks for your review!"
7. Sign in as **Admin**. See the new review in **Review moderation**, the booking reflected in **Popular subjects** bar chart, the pending application from **Ravi Shah** with Approve/Reject buttons.
8. On admin, open the **Subjects** tab — add a new subject like "Differential Equations" / "Mathematics". It immediately appears in the grouped list.

## 4. CI / CD Status

- **CI:** [![CI](https://github.com/calvindeka/TutorConnect/actions/workflows/ci.yml/badge.svg)](https://github.com/calvindeka/TutorConnect/actions/workflows/ci.yml) — every push runs Vitest backend (against a real MariaDB 10.11 service container), Vitest frontend, and `vite build`.
- **Total tests passing in CI: 64** (44 backend integration + 12 frontend component + 8 e2e).
- **CD:** `.github/workflows/cd.yml` is wired to a **self-hosted runner** on the Kenyon server. Server-side `Linger=no` means the runner has to be started manually for now (`ssh deka1@10.192.145.179`, `cd ~/actions-runner && ./run.sh`) — see [CD_SETUP.md](CD_SETUP.md). The CD assignment explicitly notes that manual runner start is acceptable.

## 5. Rubric self-check

| Category | Points | Status |
| --- | --- | --- |
| Functionality & Completeness | /25 | All MVP features working: auth, application workflow, search/filter, booking with conflict detection + state machine, reviews, admin moderation, AI recommendations with fallback. |
| Scope & Design | /10 | Delivered the proposal's MVP in full. |
| UI / UX | /10 | Bootstrap-based, consistent role-aware nav, toast notifications, empty states, brand identity (gradient hero, Inter font, custom palette). |
| Database & CRUD | /15 | 7 normalized tables, FK constraints with `CASCADE`/`RESTRICT`, indexes, full CRUD where appropriate. Parameterized queries everywhere. |
| API & Backend Logic | /15 | ~25 endpoints, session-based auth (sanitized — no `password_hash` ever leaks), role middleware, validation, real business logic (conflict detection, state machine). |
| Deployment (PM2) | /10 | Running on `10.192.145.179:4131` via PM2; `pm2 save`d so it survives. |
| README | /10 | Project overview, intended users, features, install steps, .env config, schema, full API docs (one row per endpoint), suggested workflow. |
| CI/CD | /5 | CI green on every push (real MariaDB integration tests). CD workflow + self-hosted runner registered + `deploy.sh` working. |
| AI Reflection | /10 | `AI_REFLECTION.md` — specific examples of where AI helped, where it made real mistakes (password_hash leak, ESM/CJS mismatch, parameterized SQL, label-vs-placeholder Playwright queries), and what was learned. |

## 6. AI Reflection

See [AI_REFLECTION.md](AI_REFLECTION.md). Specific examples include:

- AI silently put `password_hash` in the `/api/auth/me` response — caught during code review, fixed with a `sanitize(user)` helper, and pinned with a regression test.
- AI generated a SQL string that interpolated `${id}` directly — replaced with parameterized `?` placeholders before it ever ran.
- AI used `import` syntax in a CommonJS test file — fixed by renaming to `.mjs` + `createRequire`.
- AI used `getByLabel("Email")` in Playwright that didn't work because react-bootstrap's `Form.Group` doesn't auto-link labels.
- AI's first AI-recommendation route had no fallback — would have 500'd for the grader. Rewrote with deterministic fallback.

The reflection also covers what was learned about constraining prompts up front, reading every generated file before integrating it, and the "AI types, you decide" division of labor.
