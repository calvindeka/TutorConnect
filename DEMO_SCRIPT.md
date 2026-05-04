# Live Demo Script — TutorConnect

**~5 minutes · printable · hold this while you demo**

---

## Before you click anything

- [ ] Re-seed the DB (so data is clean): `ssh deka1@10.192.145.179`, then `cd ~/sd/TutorConnect/server && node scripts/seed.js`
- [ ] Open browser to `http://10.192.145.179:4131/` — make sure you are **signed out**
- [ ] Have backup tab ready: `http://localhost:4131` running on your laptop
- [ ] Note today's day of week. For the booking step you'll need a date that is a **Tuesday or Thursday** (when Marcus is available)

---

## STEP 1 · Sign in as a student (45 sec)

**CLICK:** "Sign in" in the navbar → use `alex.smith@kenyon.edu` / `student123`

> "I'm signing in as Alex, a student."

**ON SCREEN:** Student dashboard appears.

> "This is the student dashboard. I can see one past session with Jane Doe — already reviewed. On the right is the AI tutor-matching widget — pick a subject and it ranks the best-fit tutor with a one-sentence reason."

**POINT TO:** the role badge in the top-right that says STUDENT. The terracotta star icons. The sage stat numbers.

---

## STEP 2 · Find a tutor & book a session (75 sec)

**CLICK:** "Find a Tutor" in the navbar.

> "Search and filter — by subject, day of week, minimum rating, free-text on bio."

**CLICK:** Subject dropdown → pick **"Calculus I"**.

> "Now I only see tutors who teach Calc I. Let me open Marcus."

**CLICK:** Marcus Wong's card.

> "His full profile — bio, GPA, subjects he teaches, weekly availability table, reviews. Notice he's available Tuesdays and Thursdays 1 to 5 PM."

**CLICK:** the green **"Request session"** button.

**FILL the modal:**
- Subject: Calculus I (already selected)
- Date: pick **next Tuesday or Thursday** from the calendar
- Start time: `13:00`
- End time: `14:00`
- Location: `Math Center`
- Notes: `Going over related rates`

**CLICK:** "Send request"

> "And just like that — toast confirms it sent. The booking just enforced six rules server-side: tutor exists and is approved, subject he teaches, date in the future, time falls inside his Tuesday availability, no conflict with another session, I'm not him."

**ON SCREEN:** automatically navigates to the session detail page.

---

## STEP 3 · Switch to the tutor — confirm + complete (60 sec)

**CLICK:** the user dropdown (top-right) → "Sign out".

**SIGN IN as:** `marcus.wong@kenyon.edu` / `tutor123`

> "Now I'm Marcus. Notice the role badge changed to TUTOR."

**ON SCREEN:** Tutor dashboard. Pending requests at top.

> "There's the request Alex just sent. State machine: this is in 'requested' — only the tutor can confirm or decline."

**CLICK:** the green **"Confirm"** button on the new request.

**ON SCREEN:** Toast: "Session confirmed". Session moves to "Upcoming confirmed sessions".

> "Now it's confirmed. Once we'd actually met, I'd mark it completed."

**CLICK:** "Mark completed" on that session.

**ON SCREEN:** Toast: "Session marked completed".

> "Now the student can leave a review — but only because the session is in the 'completed' state. The state machine enforces that."

---

## STEP 4 · Switch back to the student — leave a review (45 sec)

**CLICK:** dropdown → Sign out → Sign in as `alex.smith@kenyon.edu` / `student123`

**ON SCREEN:** Student dashboard. Past sessions section now shows the new completed Calc session with "Awaiting your review" highlighted.

**CLICK:** into the session.

> "Session detail page. Because it's completed and I'm the student in the session, I can leave a review. Only one per session — there's a UNIQUE constraint on the database."

**CLICK** 5 stars in the rating picker. **TYPE:** `Marcus walked me through related rates clearly. Patient, encouraging.`

**CLICK:** "Submit review"

**ON SCREEN:** Toast: "Thanks for your review!"

> "And that flows up to the public tutor profile and the admin moderation queue."

---

## STEP 5 · Switch to admin — moderate + approve (75 sec)

**CLICK:** dropdown → Sign out → Sign in as `admin@kenyon.edu` / `admin123`

> "Final view — the admin. Different role, different dashboard."

**ON SCREEN:** Admin dashboard with the stats grid.

> "Platform-wide stats: total users, approved tutors, pending applications, sessions this week, average rating, flagged reviews. The pending count box has a warning border because it's non-zero — meaning there's something for me to act on."

**CLICK:** "Review moderation" tab.

> "And there's the review Alex just left, visible to everyone. If a student left an inappropriate comment, I could flag it from here — that hides it from the public profile but keeps it in the database for accountability."

**CLICK:** "Pending applications" tab.

> "Ravi Shah applied to tutor Physics. I'll approve him."

**CLICK:** "Approve" next to Ravi Shah.

**ON SCREEN:** Toast: "Application approved". Pending count drops to 0.

> "His user role just flipped from 'student' to 'tutor', and he'll show up in the public tutor list immediately."

**CLICK:** "Popular subjects" tab.

> "Bar chart of the most-requested subjects, scaled relative to the most-booked. Intro to CS leads, Calc behind it."

**CLICK:** "Subjects" tab.

> "And admins can add new subjects too — the form on the left, autocompleted category dropdown on the right."

---

## CLOSE (15 sec — say this no matter what)

> "That's the full lifecycle — student books, tutor confirms and completes, student leaves a review, admin moderates. Every state transition validated, every action role-gated, every database query parameterized."

**Then turn back to slides for the closing slide / Q&A.**

---

## If something breaks

| What | Recovery |
|---|---|
| Live URL won't load | Switch to `http://localhost:4131` — same data. Don't apologize, just say "let me run this from my laptop". |
| Booking modal rejects the time | You picked a wrong day. Marcus is **Tue/Thu**, Jane is **Mon/Wed/Fri**. Pick a different date. |
| Toast doesn't appear | Refresh the page — your session cookie is still valid. Continue from where you were. |
| Logged in as wrong user | User dropdown → Sign out → Sign in fresh. Don't use the back button. |
| AI recommend returns empty | Pick Calc I, Intro CS, or Organic Chem (subjects with active tutors). |
| Pending applications tab empty | You already approved Ravi in a practice run. Re-seed the DB before tomorrow. |

## Demo accounts cheat sheet

```
admin@kenyon.edu          admin123     (admin)
alex.smith@kenyon.edu     student123   (student, has 1 past session)
jordan.lee@kenyon.edu     student123   (student, has open request)
sam.wright@kenyon.edu     student123   (clean student)
jane.doe@kenyon.edu       tutor123     (tutor, Mon/Wed/Fri, CS)
marcus.wong@kenyon.edu    tutor123     (tutor, Tue/Thu, Math)
priya.patel@kenyon.edu    tutor123     (tutor, Mon/Wed/Sun, Chem/Bio)
tom.kelly@kenyon.edu      tutor123     (tutor, Tue/Thu, Econ)
ravi.shah@kenyon.edu      tutor123     (PENDING application — admin can approve)
```

## Subjects taught (for filter demos)

- **Mathematics** → Calculus I/II, Linear Algebra, Statistics, Discrete Math (Marcus)
- **Computer Science** → Intro to CS, Data Structures, Algorithms, Web Dev, SE (Jane)
- **Science** → Gen Chem, Organic Chem, Bio I/II, Physics I/II (Priya, Ravi)
- **Business** → Microeconomics, Macroeconomics, Accounting I (Tom)
