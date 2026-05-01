const express = require("express");
const { body, validationResult } = require("express-validator");
const pool = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/subjects — list all
router.get("/", requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name, category FROM subjects ORDER BY category, name");
    res.json({ subjects: rows });
  } catch (err) {
    console.error("List subjects error:", err);
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});

// POST /api/subjects — admin only
router.post(
  "/",
  requireRole("admin"),
  [
    body("name").trim().isLength({ min: 2, max: 150 }),
    body("category").trim().isLength({ min: 2, max: 100 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    try {
      const [result] = await pool.query("INSERT INTO subjects (name, category) VALUES (?, ?)", [
        req.body.name,
        req.body.category,
      ]);
      res.status(201).json({ id: result.insertId, name: req.body.name, category: req.body.category });
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ error: "Subject already exists" });
      }
      console.error("Create subject error:", err);
      res.status(500).json({ error: "Failed to create subject" });
    }
  }
);

module.exports = router;
