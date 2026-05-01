const express = require("express");
const { body, validationResult } = require("express-validator");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

// GET /api/availability/:tutorProfileId
router.get("/:tutorProfileId", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.tutorProfileId, 10);
    const [rows] = await pool.query(
      `SELECT id, day_of_week, start_time, end_time
       FROM availability
       WHERE tutor_profile_id = ?
       ORDER BY FIELD(day_of_week, 'mon','tue','wed','thu','fri','sat','sun'), start_time`,
      [id]
    );
    res.json({ slots: rows });
  } catch (err) {
    console.error("Get availability error:", err);
    res.status(500).json({ error: "Failed to fetch availability" });
  }
});

// PUT /api/availability — replace own slots (tutor only)
router.put(
  "/",
  requireAuth,
  [body("slots").isArray({ min: 0, max: 20 }).withMessage("slots must be an array of up to 20 entries")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    if (req.user.role !== "tutor" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Only tutors can set availability" });
    }

    // Find the user's tutor profile
    const [profs] = await pool.query("SELECT id, status FROM tutor_profiles WHERE user_id = ?", [req.user.id]);
    if (profs.length === 0) return res.status(403).json({ error: "No tutor profile" });
    if (profs[0].status !== "approved") return res.status(403).json({ error: "Profile not approved" });
    const tpid = profs[0].id;

    const slots = req.body.slots || [];
    for (const s of slots) {
      if (!DAYS.includes(s.day_of_week)) {
        return res.status(400).json({ error: `Invalid day_of_week: ${s.day_of_week}` });
      }
      if (!TIME_RE.test(s.start_time) || !TIME_RE.test(s.end_time)) {
        return res.status(400).json({ error: "Times must be HH:MM" });
      }
      if (s.start_time >= s.end_time) {
        return res.status(400).json({ error: "end_time must be after start_time" });
      }
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query("DELETE FROM availability WHERE tutor_profile_id = ?", [tpid]);
      for (const s of slots) {
        await conn.query(
          "INSERT INTO availability (tutor_profile_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)",
          [tpid, s.day_of_week, s.start_time, s.end_time]
        );
      }
      await conn.commit();
      const [rows] = await conn.query(
        "SELECT id, day_of_week, start_time, end_time FROM availability WHERE tutor_profile_id = ? ORDER BY FIELD(day_of_week, 'mon','tue','wed','thu','fri','sat','sun'), start_time",
        [tpid]
      );
      res.json({ slots: rows });
    } catch (err) {
      await conn.rollback();
      console.error("Update availability error:", err);
      res.status(500).json({ error: "Failed to update availability" });
    } finally {
      conn.release();
    }
  }
);

module.exports = router;
