const express = require("express");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/recommend?subject_id=N
// Returns ranked tutors with a short reason string each.
// Tries the OpenAI API if OPENAI_API_KEY is set; otherwise falls back to a
// deterministic ranking by avg_rating + session count + availability today.
router.get("/", requireAuth, async (req, res) => {
  const subjectId = parseInt(req.query.subject_id, 10);
  if (!subjectId) return res.status(400).json({ error: "subject_id is required" });

  try {
    const [tutors] = await pool.query(
      `SELECT tp.id AS tutor_id,
              u.first_name, u.last_name,
              tp.bio, tp.gpa,
              COALESCE(AVG(CASE WHEN r.flagged = FALSE THEN r.rating END), 0) AS avg_rating,
              COUNT(DISTINCT CASE WHEN r.flagged = FALSE THEN r.id END) AS review_count,
              COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) AS total_sessions,
              (SELECT COUNT(*) FROM availability a WHERE a.tutor_profile_id = tp.id) AS slot_count
       FROM tutor_profiles tp
       JOIN users u ON u.id = tp.user_id
       JOIN tutor_subjects ts ON ts.tutor_profile_id = tp.id
       LEFT JOIN reviews r ON r.tutor_profile_id = tp.id
       LEFT JOIN sessions s ON s.tutor_profile_id = tp.id
       WHERE tp.status = 'approved' AND ts.subject_id = ?
       GROUP BY tp.id
       LIMIT 8`,
      [subjectId]
    );

    if (tutors.length === 0) {
      return res.json({ recommendations: [], source: "none" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        const compactList = tutors.map((t) => ({
          tutor_id: t.tutor_id,
          name: `${t.first_name} ${t.last_name}`,
          gpa: t.gpa,
          avg_rating: Number(t.avg_rating).toFixed(2),
          review_count: t.review_count,
          total_sessions: t.total_sessions,
          available_slots_per_week: t.slot_count,
        }));
        const prompt = `Rank these tutors for the subject and write a one-sentence reason for each. Return STRICT JSON: {"recommendations":[{"tutor_id":N,"reason":"..."}, ...]} (top 3 max). Tutors:\n${JSON.stringify(
          compactList
        )}`;
        const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: "You rank tutors by quality and explain why concisely. Output strict JSON only." },
              { role: "user", content: prompt },
            ],
            temperature: 0.3,
            response_format: { type: "json_object" },
          }),
        });
        if (aiRes.ok) {
          const data = await aiRes.json();
          const content = data.choices?.[0]?.message?.content;
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed.recommendations)) {
            const recs = parsed.recommendations
              .map((r) => {
                const t = tutors.find((tu) => tu.tutor_id === r.tutor_id);
                if (!t) return null;
                return {
                  tutor_id: t.tutor_id,
                  first_name: t.first_name,
                  last_name: t.last_name,
                  avg_rating: Number(t.avg_rating),
                  total_sessions: Number(t.total_sessions),
                  reason: r.reason,
                };
              })
              .filter(Boolean);
            return res.json({ recommendations: recs, source: "ai" });
          }
        }
      } catch (e) {
        console.warn("AI recommend failed, using fallback:", e.message);
      }
    }

    // Deterministic fallback: rank by (rating * 2) + log(sessions+1) + availability bonus
    const ranked = tutors
      .map((t) => {
        const rating = Number(t.avg_rating);
        const score = rating * 2 + Math.log(Number(t.total_sessions) + 1) + Math.min(2, Number(t.slot_count) * 0.2);
        return {
          tutor_id: t.tutor_id,
          first_name: t.first_name,
          last_name: t.last_name,
          avg_rating: rating,
          total_sessions: Number(t.total_sessions),
          reason:
            rating > 0
              ? `Average rating ${rating.toFixed(1)} across ${t.review_count} reviews and ${t.total_sessions} completed sessions.`
              : `New tutor with ${t.slot_count} weekly availability slots — open for new students.`,
          _score: score,
        };
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, 3)
      .map(({ _score, ...rest }) => rest);

    res.json({ recommendations: ranked, source: "fallback" });
  } catch (err) {
    console.error("Recommend error:", err);
    res.status(500).json({ error: "Failed to compute recommendations" });
  }
});

module.exports = router;
