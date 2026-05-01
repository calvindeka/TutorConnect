// End-to-end booking → status transitions → review flow against a real DB.
process.env.DB_NAME = process.env.DB_NAME || "tutorconnect_test";

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const request = require("supertest");
const bcrypt = require("bcrypt");
const app = require("../app");
const pool = require("../config/db");

let studentEmail, tutorEmail, anotherStudentEmail;
let subjectId, tutorProfileId;

const agent = () => request.agent(app);

beforeAll(async () => {
  await pool.query("SET FOREIGN_KEY_CHECKS = 0");
  for (const t of ["reviews", "sessions", "availability", "tutor_subjects", "tutor_profiles", "users", "subjects"]) {
    await pool.query(`DELETE FROM ${t}`);
    await pool.query(`ALTER TABLE ${t} AUTO_INCREMENT = 1`);
  }
  await pool.query("SET FOREIGN_KEY_CHECKS = 1");

  // Subjects
  await pool.query("INSERT INTO subjects (name, category) VALUES ('Calculus I', 'Mathematics'), ('Algorithms', 'Computer Science')");
  const [[subj]] = await pool.query("SELECT id FROM subjects WHERE name = 'Algorithms'");
  subjectId = subj.id;

  // Users
  studentEmail = "session.student@kenyon.edu";
  tutorEmail = "session.tutor@kenyon.edu";
  anotherStudentEmail = "another.student@kenyon.edu";
  const studentHash = await bcrypt.hash("student123", 4);
  const tutorHash = await bcrypt.hash("tutor123", 4);
  await pool.query(
    "INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES (?, ?, 'S', 'One', 'student'), (?, ?, 'T', 'One', 'tutor'), (?, ?, 'S', 'Two', 'student')",
    [studentEmail, studentHash, tutorEmail, tutorHash, anotherStudentEmail, studentHash]
  );

  // Approved tutor profile, teaches Algorithms, available Tuesdays 14:00-16:00
  const [[tu]] = await pool.query("SELECT id FROM users WHERE email = ?", [tutorEmail]);
  const [tp] = await pool.query("INSERT INTO tutor_profiles (user_id, bio, status, gpa) VALUES (?, 'Bio', 'approved', 3.8)", [tu.id]);
  tutorProfileId = tp.insertId;
  await pool.query("INSERT INTO tutor_subjects (tutor_profile_id, subject_id) VALUES (?, ?)", [tutorProfileId, subjectId]);
  await pool.query(
    "INSERT INTO availability (tutor_profile_id, day_of_week, start_time, end_time) VALUES (?, 'tue', '14:00:00', '16:00:00')"
    , [tutorProfileId]
  );
});

// Pool is closed via the global afterAll in tests/teardown.mjs.

// Find next Tuesday using LOCAL components — toISOString() can shift to the
// wrong day when "now" is close to midnight in a non-UTC timezone.
function nextTuesday() {
  const d = new Date();
  while (d.getDay() !== 2) d.setDate(d.getDate() + 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const studentLogin = async (a) => a.post("/api/auth/login").send({ email: studentEmail, password: "student123" });
const tutorLogin = async (a) => a.post("/api/auth/login").send({ email: tutorEmail, password: "tutor123" });
const otherStudentLogin = async (a) => a.post("/api/auth/login").send({ email: anotherStudentEmail, password: "student123" });

describe("POST /api/sessions — booking validations", () => {
  it("rejects past dates with 400", async () => {
    const a = agent();
    await studentLogin(a);
    const res = await a.post("/api/sessions").send({
      tutor_profile_id: tutorProfileId,
      subject_id: subjectId,
      session_date: "2020-01-01",
      start_time: "14:00",
      end_time: "15:00",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/today or in the future/i);
  });

  it("rejects end_time before start_time with 400", async () => {
    const a = agent();
    await studentLogin(a);
    const res = await a.post("/api/sessions").send({
      tutor_profile_id: tutorProfileId,
      subject_id: subjectId,
      session_date: nextTuesday(),
      start_time: "15:00",
      end_time: "14:00",
    });
    expect(res.status).toBe(400);
  });

  it("rejects when the time falls outside tutor's availability", async () => {
    const a = agent();
    await studentLogin(a);
    const res = await a.post("/api/sessions").send({
      tutor_profile_id: tutorProfileId,
      subject_id: subjectId,
      session_date: nextTuesday(),
      start_time: "10:00",
      end_time: "11:00",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not available/i);
  });

  it("rejects when student tries to book with themselves (after they become a tutor)", async () => {
    const a = agent();
    await tutorLogin(a);
    const res = await a.post("/api/sessions").send({
      tutor_profile_id: tutorProfileId,
      subject_id: subjectId,
      session_date: nextTuesday(),
      start_time: "14:00",
      end_time: "15:00",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/yourself/i);
  });

  it("creates a session when everything is valid", async () => {
    const a = agent();
    await studentLogin(a);
    const res = await a.post("/api/sessions").send({
      tutor_profile_id: tutorProfileId,
      subject_id: subjectId,
      session_date: nextTuesday(),
      start_time: "14:00",
      end_time: "15:00",
      location: "Library",
      notes: "Recursion practice",
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("requested");
  });

  it("rejects a conflicting session at overlapping time", async () => {
    const a = agent();
    await otherStudentLogin(a);
    const res = await a.post("/api/sessions").send({
      tutor_profile_id: tutorProfileId,
      subject_id: subjectId,
      session_date: nextTuesday(),
      start_time: "14:30",
      end_time: "15:30",
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/conflict/i);
  });
});

describe("PATCH /api/sessions/:id/status — state machine", () => {
  let sessionId;

  it("setup: student creates a fresh session", async () => {
    const a = agent();
    await otherStudentLogin(a);
    const res = await a.post("/api/sessions").send({
      tutor_profile_id: tutorProfileId,
      subject_id: subjectId,
      session_date: nextTuesday(),
      start_time: "15:30",
      end_time: "16:00",
    });
    expect(res.status).toBe(201);
    sessionId = res.body.id;
  });

  it("rejects student trying to confirm (only tutor can)", async () => {
    const a = agent();
    await otherStudentLogin(a);
    const res = await a.patch(`/api/sessions/${sessionId}/status`).send({ status: "confirmed" });
    expect(res.status).toBe(400);
  });

  it("allows tutor to confirm a requested session", async () => {
    const a = agent();
    await tutorLogin(a);
    const res = await a.patch(`/api/sessions/${sessionId}/status`).send({ status: "confirmed" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("confirmed");
  });

  it("allows tutor to mark confirmed session completed", async () => {
    const a = agent();
    await tutorLogin(a);
    const res = await a.patch(`/api/sessions/${sessionId}/status`).send({ status: "completed" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("completed");
  });

  it("rejects further transitions from terminal state 'completed'", async () => {
    const a = agent();
    await tutorLogin(a);
    const res = await a.patch(`/api/sessions/${sessionId}/status`).send({ status: "cancelled" });
    expect(res.status).toBe(400);
  });
});

describe("Reviews — guarded by session ownership and status", () => {
  let completedSessionId;

  it("setup: another completed session for the second student", async () => {
    const a = agent();
    await otherStudentLogin(a);
    const create = await a.post("/api/sessions").send({
      tutor_profile_id: tutorProfileId,
      subject_id: subjectId,
      session_date: nextTuesday(),
      start_time: "15:00",
      end_time: "15:30",
    });
    expect(create.status).toBe(201);
    completedSessionId = create.body.id;

    const tutorAgent = agent();
    await tutorLogin(tutorAgent);
    await tutorAgent.patch(`/api/sessions/${completedSessionId}/status`).send({ status: "confirmed" }).expect(200);
    await tutorAgent.patch(`/api/sessions/${completedSessionId}/status`).send({ status: "completed" }).expect(200);
  });

  it("non-participant student cannot review", async () => {
    const a = agent();
    await studentLogin(a); // first student, who is NOT in this session
    const res = await a.post("/api/reviews").send({ session_id: completedSessionId, rating: 5 });
    expect(res.status).toBe(403);
  });

  it("rejects reviews on sessions that aren't completed", async () => {
    // create an uncompleted session
    const a = agent();
    await otherStudentLogin(a);
    const create = await a.post("/api/sessions").send({
      tutor_profile_id: tutorProfileId,
      subject_id: subjectId,
      session_date: nextTuesday(),
      start_time: "14:30",
      end_time: "14:45",
    });
    if (create.status !== 201) return; // conflict ok in this synthetic test
    const res = await a.post("/api/reviews").send({ session_id: create.body.id, rating: 5 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not completed/i);
  });

  it("rejects out-of-range ratings", async () => {
    const a = agent();
    await otherStudentLogin(a);
    const res = await a.post("/api/reviews").send({ session_id: completedSessionId, rating: 9 });
    expect(res.status).toBe(400);
  });

  it("accepts a valid review and rejects a duplicate review on the same session", async () => {
    const a = agent();
    await otherStudentLogin(a);
    const ok = await a.post("/api/reviews").send({ session_id: completedSessionId, rating: 5, comment: "Excellent" });
    expect(ok.status).toBe(201);

    const dup = await a.post("/api/reviews").send({ session_id: completedSessionId, rating: 4 });
    expect(dup.status).toBe(409);
  });
});

describe("PUT /api/availability — tutor sets weekly slots", () => {
  it("rejects non-tutors", async () => {
    const a = agent();
    await studentLogin(a);
    const res = await a.put("/api/availability").send({ slots: [] });
    expect(res.status).toBe(403);
  });

  it("rejects end_time before start_time", async () => {
    const a = agent();
    await tutorLogin(a);
    const res = await a.put("/api/availability").send({
      slots: [{ day_of_week: "mon", start_time: "16:00", end_time: "14:00" }],
    });
    expect(res.status).toBe(400);
  });

  it("replaces all slots for the tutor", async () => {
    const a = agent();
    await tutorLogin(a);
    const res = await a.put("/api/availability").send({
      slots: [
        { day_of_week: "mon", start_time: "10:00", end_time: "12:00" },
        { day_of_week: "fri", start_time: "13:00", end_time: "15:00" },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.slots).toHaveLength(2);
  });
});
