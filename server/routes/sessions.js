const express = require("express");
const { body, validationResult } = require("express-validator");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const DAY_FROM_DATE = (dateStr) => {
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const d = new Date(dateStr + "T00:00:00");
  return days[d.getDay()];
};

const overlap = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

// POST /api/sessions — student requests a session
router.post(
  "/",
  requireAuth,
  [
    body("tutor_profile_id").isInt({ min: 1 }),
    body("subject_id").isInt({ min: 1 }),
    body("session_date").matches(/^\d{4}-\d{2}-\d{2}$/),
    body("start_time").matches(/^\d{2}:\d{2}(:\d{2})?$/),
    body("end_time").matches(/^\d{2}:\d{2}(:\d{2})?$/),
    body("location").optional().isLength({ max: 255 }),
    body("notes").optional().isLength({ max: 2000 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { tutor_profile_id, subject_id, session_date, start_time, end_time, location, notes } = req.body;

    if (req.user.role !== "student" && req.user.role !== "tutor") {
      return res.status(403).json({ error: "Only students can book sessions" });
    }
    if (start_time >= end_time) return res.status(400).json({ error: "end_time must be after start_time" });
    const today = new Date().toISOString().slice(0, 10);
    if (session_date < today) return res.status(400).json({ error: "Date must be today or in the future" });

    try {
      // Check tutor exists + approved
      const [tprofs] = await pool.query(
        "SELECT tp.id, tp.user_id, tp.status FROM tutor_profiles tp WHERE tp.id = ?",
        [tutor_profile_id]
      );
      if (tprofs.length === 0 || tprofs[0].status !== "approved") {
        return res.status(404).json({ error: "Tutor not found" });
      }
      if (tprofs[0].user_id === req.user.id) {
        return res.status(400).json({ error: "You cannot book a session with yourself" });
      }

      // Check subject is one the tutor teaches
      const [subjOk] = await pool.query(
        "SELECT 1 FROM tutor_subjects WHERE tutor_profile_id = ? AND subject_id = ?",
        [tutor_profile_id, subject_id]
      );
      if (subjOk.length === 0) {
        return res.status(400).json({ error: "Tutor does not teach that subject" });
      }

      // Check tutor's availability covers the requested time
      const day = DAY_FROM_DATE(session_date);
      const [avails] = await pool.query(
        "SELECT start_time, end_time FROM availability WHERE tutor_profile_id = ? AND day_of_week = ?",
        [tutor_profile_id, day]
      );
      const fits = avails.some((a) => a.start_time <= start_time && a.end_time >= end_time);
      if (!fits) {
        return res.status(400).json({ error: "Tutor is not available at that time" });
      }

      // Check for conflicts with other confirmed/requested sessions on same date
      const [conflicts] = await pool.query(
        `SELECT id, start_time, end_time FROM sessions
         WHERE tutor_profile_id = ? AND session_date = ? AND status IN ('requested', 'confirmed')`,
        [tutor_profile_id, session_date]
      );
      if (conflicts.some((c) => overlap(start_time, end_time, c.start_time, c.end_time))) {
        return res.status(409).json({ error: "Tutor has a conflicting session at that time" });
      }

      const [result] = await pool.query(
        `INSERT INTO sessions
         (student_id, tutor_profile_id, subject_id, session_date, start_time, end_time, status, location, notes)
         VALUES (?, ?, ?, ?, ?, ?, 'requested', ?, ?)`,
        [req.user.id, tutor_profile_id, subject_id, session_date, start_time, end_time, location || null, notes || null]
      );
      res.status(201).json({ id: result.insertId, status: "requested" });
    } catch (err) {
      console.error("Create session error:", err);
      res.status(500).json({ error: "Failed to create session" });
    }
  }
);

// GET /api/sessions — list sessions for current user (filtered by their role)
router.get("/", requireAuth, async (req, res) => {
  try {
    const { status } = req.query;
    const where = [];
    const params = [];

    if (req.user.role === "admin") {
      // Admin sees nothing here unless they're also a tutor/student — match resource pattern
    } else if (req.user.role === "tutor") {
      // Sessions where current user is the tutor OR the student
      const [profs] = await pool.query("SELECT id FROM tutor_profiles WHERE user_id = ?", [req.user.id]);
      const tpid = profs[0]?.id || 0;
      where.push("(s.student_id = ? OR s.tutor_profile_id = ?)");
      params.push(req.user.id, tpid);
    } else {
      where.push("s.student_id = ?");
      params.push(req.user.id);
    }

    if (status) {
      where.push("s.status = ?");
      params.push(status);
    }

    const sql = `
      SELECT s.id, s.session_date, s.start_time, s.end_time, s.status, s.location, s.notes,
             s.student_id, s.tutor_profile_id,
             subj.name AS subject,
             stu.first_name AS student_first_name, stu.last_name AS student_last_name,
             tu.first_name AS tutor_first_name, tu.last_name AS tutor_last_name,
             EXISTS(SELECT 1 FROM reviews r WHERE r.session_id = s.id) AS has_review
      FROM sessions s
      JOIN subjects subj ON subj.id = s.subject_id
      JOIN users stu ON stu.id = s.student_id
      JOIN tutor_profiles tp ON tp.id = s.tutor_profile_id
      JOIN users tu ON tu.id = tp.user_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY s.session_date DESC, s.start_time DESC
    `;
    const [rows] = await pool.query(sql, params);
    res.json({ sessions: rows.map((r) => ({ ...r, has_review: !!r.has_review })) });
  } catch (err) {
    console.error("List sessions error:", err);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

// GET /api/sessions/:id
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.query(
      `SELECT s.*, subj.name AS subject,
              stu.first_name AS student_first_name, stu.last_name AS student_last_name,
              tu.id AS tutor_user_id, tu.first_name AS tutor_first_name, tu.last_name AS tutor_last_name
       FROM sessions s
       JOIN subjects subj ON subj.id = s.subject_id
       JOIN users stu ON stu.id = s.student_id
       JOIN tutor_profiles tp ON tp.id = s.tutor_profile_id
       JOIN users tu ON tu.id = tp.user_id
       WHERE s.id = ?`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Session not found" });
    const session = rows[0];
    const isInvolved = session.student_id === req.user.id || session.tutor_user_id === req.user.id;
    if (!isInvolved && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json({ session });
  } catch (err) {
    console.error("Get session error:", err);
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

// PATCH /api/sessions/:id/status
router.patch(
  "/:id/status",
  requireAuth,
  [body("status").isIn(["confirmed", "completed", "cancelled"])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    const id = parseInt(req.params.id, 10);
    const next = req.body.status;
    try {
      const [rows] = await pool.query(
        `SELECT s.*, tp.user_id AS tutor_user_id FROM sessions s JOIN tutor_profiles tp ON tp.id = s.tutor_profile_id WHERE s.id = ?`,
        [id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "Session not found" });
      const session = rows[0];
      const isStudent = session.student_id === req.user.id;
      const isTutor = session.tutor_user_id === req.user.id;
      if (!isStudent && !isTutor && req.user.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      const cur = session.status;
      // Valid transitions
      const allowed = {
        requested: { confirmed: isTutor, cancelled: isStudent || isTutor },
        confirmed: { completed: isTutor, cancelled: isStudent || isTutor },
      };
      if (!allowed[cur] || !allowed[cur][next]) {
        return res.status(400).json({ error: `Cannot transition from ${cur} to ${next}` });
      }
      await pool.query("UPDATE sessions SET status = ? WHERE id = ?", [next, id]);
      res.json({ id, status: next });
    } catch (err) {
      console.error("Status update error:", err);
      res.status(500).json({ error: "Failed to update status" });
    }
  }
);

module.exports = router;
