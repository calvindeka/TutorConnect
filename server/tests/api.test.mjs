// IMPORTANT: tests must use a SEPARATE database so they never touch dev data.
// Default to `tutorconnect_test`; CI sets DB_NAME via the workflow env.
process.env.DB_NAME = process.env.DB_NAME || "tutorconnect_test";

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const request = require("supertest");
const bcrypt = require("bcrypt");
const app = require("../app");
const pool = require("../config/db");

// Helper: hit the app + return supertest agent (preserves cookies)
const agent = () => request.agent(app);

beforeAll(async () => {
  // Reset to a known clean state for the tests that need DB
  await pool.query("SET FOREIGN_KEY_CHECKS = 0");
  for (const t of ["reviews", "sessions", "availability", "tutor_subjects", "tutor_profiles", "users", "subjects"]) {
    await pool.query(`DELETE FROM ${t}`);
    await pool.query(`ALTER TABLE ${t} AUTO_INCREMENT = 1`);
  }
  await pool.query("SET FOREIGN_KEY_CHECKS = 1");

  // Seed minimum: a few subjects + an admin + a student
  await pool.query("INSERT INTO subjects (name, category) VALUES ('Calculus I', 'Mathematics'), ('Intro to Computer Science', 'Computer Science')");
  const adminHash = await bcrypt.hash("admin123", 4);
  const studentHash = await bcrypt.hash("student123", 4);
  await pool.query(
    "INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES (?, ?, 'Test', 'Admin', 'admin'), (?, ?, 'Test', 'Student', 'student')",
    ["test.admin@kenyon.edu", adminHash, "test.student@kenyon.edu", studentHash]
  );
});

// Pool is closed via the global afterAll in tests/teardown.mjs.

describe("GET /api/health", () => {
  it("returns ok status and a timestamp", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.timestamp).toBeDefined();
  });
});

describe("API auth gating", () => {
  it("rejects /api/auth/me without a session", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Not authenticated");
  });

  it("rejects /api/dashboard/stats for non-admins", async () => {
    const res = await request(app).get("/api/dashboard/stats");
    expect(res.status).toBe(401);
  });

  it("returns JSON 404 for unknown /api routes", async () => {
    const res = await request(app).get("/api/totally-fake");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Not found");
  });
});

describe("POST /api/auth/login", () => {
  it("rejects empty body with a 400", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("rejects bogus credentials with a 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password");
  });

  it("rejects wrong password for a real user with a 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test.student@kenyon.edu", password: "wrong-password" });
    expect(res.status).toBe(401);
  });

  it("logs in valid credentials and returns sanitized user (no password_hash)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test.student@kenyon.edu", password: "student123" });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("test.student@kenyon.edu");
    expect(res.body.user.role).toBe("student");
    expect(res.body.user.password_hash).toBeUndefined();
  });
});

describe("POST /api/auth/register", () => {
  it("validates email format", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "not-an-email", password: "abcdef1", first_name: "A", last_name: "B" });
    expect(res.status).toBe(400);
  });

  it("requires a 6+ character password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "shortpw@kenyon.edu", password: "abc", first_name: "A", last_name: "B" });
    expect(res.status).toBe(400);
  });

  it("creates a new user and returns sanitized payload", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "new.user@kenyon.edu", password: "secret123", first_name: "New", last_name: "User" });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("new.user@kenyon.edu");
    expect(res.body.user.role).toBe("student");
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it("rejects duplicate email with a 409", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "test.student@kenyon.edu", password: "secret123", first_name: "X", last_name: "Y" });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already/i);
  });
});

describe("Session persistence (the auth assignment's hard requirement)", () => {
  it("/api/auth/me returns the logged-in user after login", async () => {
    const a = agent();
    await a
      .post("/api/auth/login")
      .send({ email: "test.student@kenyon.edu", password: "student123" })
      .expect(200);
    const me = await a.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe("test.student@kenyon.edu");
  });

  it("/api/auth/logout destroys the session — /me then 401", async () => {
    const a = agent();
    await a
      .post("/api/auth/login")
      .send({ email: "test.student@kenyon.edu", password: "student123" })
      .expect(200);
    await a.post("/api/auth/logout").expect(200);
    const me = await a.get("/api/auth/me");
    expect(me.status).toBe(401);
  });
});

describe("GET /api/subjects", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/subjects");
    expect(res.status).toBe(401);
  });

  it("returns the seeded subjects when authenticated", async () => {
    const a = agent();
    await a.post("/api/auth/login").send({ email: "test.student@kenyon.edu", password: "student123" });
    const res = await a.get("/api/subjects");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.subjects)).toBe(true);
    expect(res.body.subjects.length).toBeGreaterThan(0);
    expect(res.body.subjects.find((s) => s.name === "Calculus I")).toBeDefined();
  });
});

describe("Admin-only routes", () => {
  it("non-admin users get 403 on /api/dashboard/stats", async () => {
    const a = agent();
    await a.post("/api/auth/login").send({ email: "test.student@kenyon.edu", password: "student123" });
    const res = await a.get("/api/dashboard/stats");
    expect(res.status).toBe(403);
  });

  it("admins get the stats payload", async () => {
    const a = agent();
    await a.post("/api/auth/login").send({ email: "test.admin@kenyon.edu", password: "admin123" });
    const res = await a.get("/api/dashboard/stats");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("total_users");
    expect(res.body).toHaveProperty("popular_subjects");
  });
});

describe("POST /api/tutors/apply (full workflow)", () => {
  it("creates a pending tutor application and admin can approve it", async () => {
    // student applies
    const studentAgent = agent();
    await studentAgent
      .post("/api/auth/login")
      .send({ email: "test.student@kenyon.edu", password: "student123" })
      .expect(200);

    const subjectsRes = await studentAgent.get("/api/subjects");
    const subjectIds = subjectsRes.body.subjects.slice(0, 2).map((s) => s.id);

    const applyRes = await studentAgent
      .post("/api/tutors/apply")
      .send({ bio: "I love teaching CS and have done it for years.", gpa: 3.85, subject_ids: subjectIds });
    expect(applyRes.status).toBe(201);
    expect(applyRes.body.status).toBe("pending");
    const applicationId = applyRes.body.id;

    // duplicate application is rejected
    const dupRes = await studentAgent
      .post("/api/tutors/apply")
      .send({ bio: "trying again", gpa: 3.0, subject_ids: subjectIds });
    expect(dupRes.status).toBe(409);

    // admin sees the pending application
    const adminAgent = agent();
    await adminAgent
      .post("/api/auth/login")
      .send({ email: "test.admin@kenyon.edu", password: "admin123" })
      .expect(200);

    const pendingRes = await adminAgent.get("/api/tutors/admin/pending");
    expect(pendingRes.status).toBe(200);
    expect(pendingRes.body.applications.find((a) => a.id === applicationId)).toBeDefined();

    // admin approves
    const approveRes = await adminAgent
      .patch(`/api/tutors/${applicationId}/status`)
      .send({ status: "approved" });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe("approved");

    // re-approval fails because state has moved on
    const reapproveRes = await adminAgent
      .patch(`/api/tutors/${applicationId}/status`)
      .send({ status: "approved" });
    expect(reapproveRes.status).toBe(400);

    // student's role is now 'tutor'
    const me = await studentAgent.get("/api/auth/me");
    expect(me.body.user.role).toBe("tutor");
    expect(me.body.user.tutor_profile).toBeDefined();
    expect(me.body.user.tutor_profile.status).toBe("approved");

    // approved tutor shows up in the public list
    const list = await studentAgent.get("/api/tutors");
    expect(list.body.tutors.find((t) => t.id === applicationId)).toBeDefined();
  });
});
