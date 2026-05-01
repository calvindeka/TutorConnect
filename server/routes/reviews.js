const express = require("express");
const { body, validationResult } = require("express-validator");
const pool = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// POST /api/reviews — student leaves a review for a completed session
router.post(
  "/",
  requireAuth,
  [
    body("session_id").isInt({ min: 1 }),
    body("rating").isInt({ min: 1, max: 5 }),
    body("comment").optional().isLength({ max: 2000 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    const { session_id, rating, comment } = req.body;
    try {
      const [rows] = await pool.query(
        "SELECT id, student_id, tutor_profile_id, status FROM sessions WHERE id = ?",
        [session_id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "Session not found" });
      const s = rows[0];
      if (s.student_id !== req.user.id) {
        return res.status(403).json({ error: "Only the student in the session can review" });
      }
      if (s.status !== "completed") {
        return res.status(400).json({ error: "Session is not completed yet" });
      }
      const [exists] = await pool.query("SELECT id FROM reviews WHERE session_id = ?", [session_id]);
      if (exists.length > 0) {
        return res.status(409).json({ error: "You already reviewed this session" });
      }
      const [result] = await pool.query(
        "INSERT INTO reviews (session_id, student_id, tutor_profile_id, rating, comment) VALUES (?, ?, ?, ?, ?)",
        [session_id, req.user.id, s.tutor_profile_id, rating, comment || null]
      );
      res.status(201).json({ id: result.insertId, session_id, rating, comment: comment || null });
    } catch (err) {
      console.error("Create review error:", err);
      res.status(500).json({ error: "Failed to create review" });
    }
  }
);

// GET /api/reviews/:tutorProfileId — public reviews for a tutor (excludes flagged)
router.get("/:tutorProfileId", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.tutorProfileId, 10);
    const [rows] = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              u.first_name AS student_first_name,
              subj.name AS subject
       FROM reviews r
       JOIN sessions s ON s.id = r.session_id
       JOIN users u ON u.id = r.student_id
       JOIN subjects subj ON subj.id = s.subject_id
       WHERE r.tutor_profile_id = ? AND r.flagged = FALSE
       ORDER BY r.created_at DESC`,
      [id]
    );
    const [agg] = await pool.query(
      "SELECT AVG(rating) AS avg_rating, COUNT(*) AS total FROM reviews WHERE tutor_profile_id = ? AND flagged = FALSE",
      [id]
    );
    res.json({
      reviews: rows,
      avg_rating: agg[0].avg_rating ? Number(agg[0].avg_rating) : 0,
      total_reviews: Number(agg[0].total),
    });
  } catch (err) {
    console.error("List reviews error:", err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// GET /api/reviews/admin/flagged — all reviews flagged or unflagged (admin moderation queue)
router.get("/admin/all", requireRole("admin"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.flagged, r.created_at,
              u.first_name AS student_first_name, u.last_name AS student_last_name,
              tu.first_name AS tutor_first_name, tu.last_name AS tutor_last_name
       FROM reviews r
       JOIN users u ON u.id = r.student_id
       JOIN tutor_profiles tp ON tp.id = r.tutor_profile_id
       JOIN users tu ON tu.id = tp.user_id
       ORDER BY r.flagged DESC, r.created_at DESC`
    );
    res.json({ reviews: rows.map((r) => ({ ...r, flagged: !!r.flagged })) });
  } catch (err) {
    console.error("Admin reviews error:", err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// PATCH /api/reviews/:id/flag — admin toggles flagged
router.patch(
  "/:id/flag",
  requireRole("admin"),
  [body("flagged").isBoolean()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    const id = parseInt(req.params.id, 10);
    await pool.query("UPDATE reviews SET flagged = ? WHERE id = ?", [req.body.flagged ? 1 : 0, id]);
    res.json({ id, flagged: !!req.body.flagged });
  }
);

module.exports = router;
