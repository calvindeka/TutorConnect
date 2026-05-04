# How to Nail Tomorrow — TutorConnect Presentation

**May 5, 2026 · Final Project Presentation**

The rubric tells you exactly where the 100 points sit. Most people lose them in three places: the demo (20 pts, biggest single category), preparedness (10 pts, easy to nail with rehearsal), and saying "sorry" or "this is unfinished" (kills clarity + preparedness scores). Let's hit all three.

## The math: where the 100 points live

| Category | Points | How you nail it |
|---|---|---|
| **Demo Quality** | **20** | Pre-rehearsed 5-step demo path. Know what to click before you click. Never have a "where is that page again?" moment. |
| Project Overview | 10 | First 60 seconds — say what + who + problem in 2 sentences. |
| System Features | 10 | Use the lifecycle slide as a backbone — name the state machine, mention conflict detection. |
| Database | 10 | Don't read the table list — say *why* (single users table, separate tutor_profiles, computed avg rating). |
| Architecture/API | 10 | "Single-port. Sessions, not JWT. Why? Three reasons." |
| AI Use | 10 | Map each AI use to a class assignment. Name 2 specific bugs you caught. |
| Lessons | 10 | Pick 2 technical, 2 AI lessons. Don't list 11. |
| Clarity & Organization | 10 | Don't go over time. Practice with a stopwatch. |
| **Preparedness** | **10** | Live URL working, backup ready, slides cued, no fumbling for accounts/passwords. |

Demo + Preparedness = 30 points. Half your grade is "did this work and did it look practiced." Other half is content the slides already cover.

## Tonight (90 min total)

### 1. Rehearse the slides — 3 times, with a stopwatch (~45 min)

Open the deck full-screen. Read PRESENTATION_NOTES.pdf once. Then close the notes and present out loud to your room. Time it. Target: 9–10 minutes for slides, leaving 4–5 for demo + Q&A.

If you go over: cut the longest sentence in slides 8 and 10 — those are the densest.
If you go under: that's fine, more demo time.

### 2. Rehearse the demo — 2 full runs (~30 min)

Sign in to the live app right now. Walk through every step in the demo script. Then **do it again**. By the second run, the click sequence should feel automatic.

Things to verify:
- Marcus Wong has Tuesday/Thursday availability — pick one of those days for the booking
- After "Mark completed", the review form appears for the student
- Admin's "Pending applications" tab shows Ravi Shah

### 3. Stage your environment (~10 min)

Pre-open these tabs in Chrome and **leave them open overnight**:

- Tab 1: `http://10.192.145.179:4131/` (the live app)
- Tab 2: Your slide deck (open `TutorConnect_Presentation.pptx` in Keynote or PowerPoint, full-screen ready)
- Tab 3: `https://github.com/calvindeka/TutorConnect` (in case anyone asks to see code)
- Tab 4: `https://github.com/calvindeka/TutorConnect/actions` (proof of green CI)

Have your terminal open with one tab SSH'd into the server (so if PM2 needs a poke you don't fumble).

### 4. Reset the demo data (~5 min)

Right before bed, do this so you have a clean dataset for the demo:

```bash
ssh deka1@10.192.145.179
cd ~/sd/TutorConnect/server && node scripts/seed.js
```

That puts the seed data back to a known state — Ravi's pending application is back, Alex has 1 completed past session with Jane, etc. If tonight you do a practice booking, this resets it.

## Tomorrow morning, before you walk in

### T-30 minutes

1. SSH in. Run `pm2 status` — confirm tutorconnect is "online". Run `curl http://10.192.145.179:4131/api/health` — confirm `{"status":"ok"}`.
2. Re-seed the DB so demo data is fresh.
3. Open the live URL in your browser, sign out (clean slate). Don't sign in until the demo.

### T-5 minutes

1. Slide deck full-screen.
2. Take 3 deep breaths. Drink water.

## During the demo — the 20-point category

The graders score **what they see**, not what you say is happening. So:

**Practice this exact sequence until it's muscle memory:**

1. Start signed out, on the home page → "Let me start as a student" → click Sign in → demo creds
2. Find a Tutor → filter Calculus → click Marcus → Request session → fill form → submit → toast appears
3. User dropdown → Sign out → Sign in as `marcus.wong@kenyon.edu` → Confirm → Mark completed
4. Sign out → Sign in as Alex → past session → 5-star review
5. Sign out → Sign in as admin → see review in moderation, approve Ravi's application

**While clicking, narrate what's happening** — graders need to know *why* this matters:

> "Notice the toast — that's a custom notification system. The booking just enforced six rules server-side."

## What to say if something breaks

**Calm narration > panic.** If a click fails:

> "While that loads, what you're about to see is..."

If the live URL is down (firewall? VPN? campus network glitch?):

> "Let me run this from my laptop — same data, same code." [Switch to localhost:4131]

Have `localhost:4131` already running on your laptop as a hot backup. Run before you leave home:

```bash
cd ~/Desktop/TutorConnect/server && pm2 start index.js --name tutorconnect-local
```

## Things to NEVER say

- "Sorry it's slow" / "sorry this is unfinished" / "I didn't have time to..."
- "I just used AI to..." (suggests you didn't think)
- "I think it works..." (suggests it doesn't)
- Reading slides verbatim

**Instead:**

- "I made the trade-off to..." (you decided)
- "I designed this with..." (you owned it)
- "I verified this with..." (you checked)
- "If I had more time, the next thing I'd add is..." (forward-looking, not apologetic)

## Q&A — the cheat sheet

Most likely questions and the 10-second answer:

| Question | Answer |
|---|---|
| "Why sessions, not JWT?" | "Auth assignment said no JWT. Same-origin app, so a session cookie is simpler and more secure than a token in localStorage." |
| "How does the AI recommendation work?" | "OpenAI gpt-4o-mini if the key is set, otherwise a deterministic ranking — `rating × 2 + log(sessions+1) + slot bonus`. Always works." |
| "How big is the project?" | "~25 endpoints, 11 frontend pages, 7 tables, 64 tests across three layers, all CI-green." |
| "What was the hardest part?" | "MariaDB returns TIME columns as `HH:MM:SS` but my form sent `HH:MM` — silent string-comparison failure was rejecting every booking. Caught it with an integration test against a real DB in CI, not mocks." |
| "What would you do differently?" | "Pin the auth response shape with a test on day one. I caught the password_hash leak on review, but a test would have caught it the moment it appeared." |
| "Can I see the code?" | [Switch to repo tab] "github.com/calvindeka/TutorConnect — README has the full API docs, ARCHITECTURE.md walks through the design decisions." |

## TL;DR — the 5 things that win this presentation

1. **Practice the demo twice tonight.** That's 20 points.
2. **Don't go over time.** Use a stopwatch when you rehearse.
3. **Never apologize.** "I made the trade-off to..." not "sorry I didn't..."
4. **Have the live URL working before T-30 minutes.** And have localhost as a backup.
5. **Memorize 3 sentences:** the 60-second project pitch, the "why I chose sessions," and the "what was the hardest part" answer. Everything else flows.
