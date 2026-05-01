const express = require("express");
const pool = require("../config/db");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/dashboard/stats — admin only
router.get("/stats", requireRole("admin"), async (req, res) => {
  try {
    const [[users]] = await pool.query("SELECT COUNT(*) AS n FROM users");
    const [[tutors]] = await pool.query("SELECT COUNT(*) AS n FROM tutor_profiles WHERE status = 'approved'");
    const [[pending]] = await pool.query("SELECT COUNT(*) AS n FROM tutor_profiles WHERE status = 'pending'");
    const [[sessions]] = await pool.query("SELECT COUNT(*) AS n FROM sessions");
    const [[completed]] = await pool.query("SELECT COUNT(*) AS n FROM sessions WHERE status = 'completed'");
    const [[week]] = await pool.query(
      "SELECT COUNT(*) AS n FROM sessions WHERE session_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)"
    );
    const [[avg]] = await pool.query("SELECT AVG(rating) AS avg FROM reviews WHERE flagged = FALSE");
    const [[flagged]] = await pool.query("SELECT COUNT(*) AS n FROM reviews WHERE flagged = TRUE");
    const [popular] = await pool.query(
      `SELECT subj.name, COUNT(s.id) AS session_count
       FROM sessions s JOIN subjects subj ON subj.id = s.subject_id
       GROUP BY subj.id, subj.name
       ORDER BY session_count DESC
       LIMIT 5`
    );
    res.json({
      total_users: Number(users.n),
      total_tutors: Number(tutors.n),
      pending_applications: Number(pending.n),
      total_sessions: Number(sessions.n),
      sessions_this_week: Number(week.n),
      completed_sessions: Number(completed.n),
      avg_rating: avg.avg ? Number(avg.avg) : 0,
      flagged_reviews: Number(flagged.n),
      popular_subjects: popular.map((p) => ({ name: p.name, session_count: Number(p.session_count) })),
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

module.exports = router;
