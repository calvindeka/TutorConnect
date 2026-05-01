const express = require("express");
const { body, validationResult } = require("express-validator");
const pool = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/tutors — list approved tutors with filters
// Query params: subject (name), min_rating, day, sort_by (rating|sessions), q (search), page, limit
router.get("/", requireAuth, async (req, res) => {
  try {
    const { subject, min_rating, day, sort_by, q } = req.query;
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "20", 10)));
    const offset = (page - 1) * limit;

    const where = ["tp.status = 'approved'"];
    const params = [];

    if (subject) {
      where.push(
        `tp.id IN (SELECT ts.tutor_profile_id FROM tutor_subjects ts JOIN subjects s ON s.id = ts.subject_id WHERE s.name = ?)`
      );
      params.push(subject);
    }
    if (day) {
      where.push(`tp.id IN (SELECT a.tutor_profile_id FROM availability a WHERE a.day_of_week = ?)`);
      params.push(day);
    }
    if (q) {
      where.push("(u.first_name LIKE ? OR u.last_name LIKE ? OR tp.bio LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const sortClause =
      sort_by === "sessions"
        ? "ORDER BY total_sessions DESC, avg_rating DESC"
        : "ORDER BY avg_rating DESC, review_count DESC";

    const sql = `
      SELECT
        tp.id, tp.bio, tp.gpa, tp.status,
        u.id AS user_id, u.first_name, u.last_name, u.profile_image_url,
        COALESCE(AVG(CASE WHEN r.flagged = FALSE THEN r.rating END), 0) AS avg_rating,
        COUNT(DISTINCT CASE WHEN r.flagged = FALSE THEN r.id END) AS review_count,
        COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) AS total_sessions
      FROM tutor_profiles tp
      JOIN users u ON u.id = tp.user_id
      LEFT JOIN reviews r ON r.tutor_profile_id = tp.id
      LEFT JOIN sessions s ON s.tutor_profile_id = tp.id
      WHERE ${where.join(" AND ")}
      GROUP BY tp.id
      ${min_rating ? `HAVING avg_rating >= ${parseFloat(min_rating)}` : ""}
      ${sortClause}
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(sql, [...params, limit, offset]);

    // Attach subjects to each tutor
    if (rows.length) {
      const ids = rows.map((r) => r.id);
      const [subjs] = await pool.query(
        `SELECT ts.tutor_profile_id, s.id, s.name, s.category
         FROM tutor_subjects ts JOIN subjects s ON s.id = ts.subject_id
         WHERE ts.tutor_profile_id IN (${ids.map(() => "?").join(",")})`,
        ids
      );
      const map = new Map(rows.map((r) => [r.id, []]));
      subjs.forEach((s) => map.get(s.tutor_profile_id).push({ id: s.id, name: s.name, category: s.category }));
      rows.forEach((r) => {
        r.subjects = map.get(r.id) || [];
        r.avg_rating = Number(r.avg_rating);
      });
    }

    res.json({ tutors: rows, page, limit });
  } catch (err) {
    console.error("List tutors error:", err);
    res.status(500).json({ error: "Failed to fetch tutors" });
  }
});

// GET /api/tutors/:id — full profile
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.query(
      `SELECT tp.id, tp.bio, tp.gpa, tp.status, tp.created_at,
              u.id AS user_id, u.first_name, u.last_name, u.email, u.profile_image_url,
              COALESCE(AVG(CASE WHEN r.flagged = FALSE THEN r.rating END), 0) AS avg_rating,
              COUNT(DISTINCT CASE WHEN r.flagged = FALSE THEN r.id END) AS review_count,
              COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) AS total_sessions
       FROM tutor_profiles tp
       JOIN users u ON u.id = tp.user_id
       LEFT JOIN reviews r ON r.tutor_profile_id = tp.id
       LEFT JOIN sessions s ON s.tutor_profile_id = tp.id
       WHERE tp.id = ?
       GROUP BY tp.id`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Tutor not found" });
    const tutor = rows[0];
    if (tutor.status !== "approved" && req.user.role !== "admin") {
      return res.status(404).json({ error: "Tutor not found" });
    }
    const [subjs] = await pool.query(
      `SELECT s.id, s.name, s.category FROM tutor_subjects ts JOIN subjects s ON s.id = ts.subject_id WHERE ts.tutor_profile_id = ?`,
      [id]
    );
    const [avail] = await pool.query(
      `SELECT id, day_of_week, start_time, end_time FROM availability WHERE tutor_profile_id = ? ORDER BY FIELD(day_of_week, 'mon','tue','wed','thu','fri','sat','sun'), start_time`,
      [id]
    );
    tutor.subjects = subjs;
    tutor.availability = avail;
    tutor.avg_rating = Number(tutor.avg_rating);
    res.json({ tutor });
  } catch (err) {
    console.error("Get tutor error:", err);
    res.status(500).json({ error: "Failed to fetch tutor" });
  }
});

// POST /api/tutors/apply — student submits a tutor application
router.post(
  "/apply",
  requireAuth,
  [
    body("bio").isLength({ min: 10, max: 1000 }).withMessage("Bio must be 10-1000 characters"),
    body("gpa").optional().isFloat({ min: 0, max: 4 }).withMessage("GPA must be 0.00-4.00"),
    body("subject_ids").isArray({ min: 1 }).withMessage("Pick at least one subject"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    if (req.user.role === "admin") {
      return res.status(403).json({ error: "Admins cannot tutor" });
    }
    const conn = await pool.getConnection();
    try {
      const { bio, gpa, subject_ids } = req.body;
      const [existing] = await conn.query("SELECT id FROM tutor_profiles WHERE user_id = ?", [req.user.id]);
      if (existing.length > 0) {
        return res.status(409).json({ error: "You already have a tutor application" });
      }
      await conn.beginTransaction();
      const [result] = await conn.query(
        "INSERT INTO tutor_profiles (user_id, bio, gpa, status) VALUES (?, ?, ?, 'pending')",
        [req.user.id, bio, gpa ?? null]
      );
      for (const sid of subject_ids) {
        await conn.query(
          "INSERT INTO tutor_subjects (tutor_profile_id, subject_id) VALUES (?, ?)",
          [result.insertId, sid]
        );
      }
      await conn.commit();
      res.status(201).json({ id: result.insertId, status: "pending" });
    } catch (err) {
      await conn.rollback();
      console.error("Apply error:", err);
      res.status(500).json({ error: "Application failed" });
    } finally {
      conn.release();
    }
  }
);

// GET /api/tutors/admin/pending — list pending applications (admin only)
router.get("/admin/pending", requireRole("admin"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT tp.id, tp.bio, tp.gpa, tp.status, tp.created_at,
              u.id AS user_id, u.first_name, u.last_name, u.email
       FROM tutor_profiles tp
       JOIN users u ON u.id = tp.user_id
       WHERE tp.status = 'pending'
       ORDER BY tp.created_at ASC`
    );
    if (rows.length) {
      const ids = rows.map((r) => r.id);
      const [subjs] = await pool.query(
        `SELECT ts.tutor_profile_id, s.id, s.name, s.category
         FROM tutor_subjects ts JOIN subjects s ON s.id = ts.subject_id
         WHERE ts.tutor_profile_id IN (${ids.map(() => "?").join(",")})`,
        ids
      );
      const map = new Map(rows.map((r) => [r.id, []]));
      subjs.forEach((s) =>
        map.get(s.tutor_profile_id).push({ id: s.id, name: s.name, category: s.category })
      );
      rows.forEach((r) => (r.subjects = map.get(r.id) || []));
    }
    res.json({ applications: rows });
  } catch (err) {
    console.error("Pending tutors error:", err);
    res.status(500).json({ error: "Failed to fetch pending applications" });
  }
});

// PATCH /api/tutors/:id/status — admin approves/rejects
router.patch(
  "/:id/status",
  requireRole("admin"),
  [body("status").isIn(["approved", "rejected"]).withMessage("Status must be 'approved' or 'rejected'")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.query("SELECT user_id, status FROM tutor_profiles WHERE id = ?", [id]);
      if (rows.length === 0) {
        await conn.rollback();
        return res.status(404).json({ error: "Application not found" });
      }
      if (rows[0].status !== "pending") {
        await conn.rollback();
        return res.status(400).json({ error: "Application has already been decided" });
      }
      await conn.query("UPDATE tutor_profiles SET status = ? WHERE id = ?", [status, id]);
      if (status === "approved") {
        await conn.query("UPDATE users SET role = 'tutor' WHERE id = ?", [rows[0].user_id]);
      }
      await conn.commit();
      res.json({ id, status });
    } catch (err) {
      await conn.rollback();
      console.error("Status update error:", err);
      res.status(500).json({ error: "Status update failed" });
    } finally {
      conn.release();
    }
  }
);

// PUT /api/tutors/:id — tutor updates own profile (bio, gpa)
router.put(
  "/:id",
  requireAuth,
  [body("bio").optional().isLength({ min: 10, max: 1000 }), body("gpa").optional().isFloat({ min: 0, max: 4 })],
  async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.query("SELECT user_id FROM tutor_profiles WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Tutor not found" });
    if (rows[0].user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const { bio, gpa } = req.body;
    await pool.query("UPDATE tutor_profiles SET bio = COALESCE(?, bio), gpa = COALESCE(?, gpa) WHERE id = ?", [
      bio ?? null,
      gpa ?? null,
      id,
    ]);
    res.json({ id });
  }
);

module.exports = router;
