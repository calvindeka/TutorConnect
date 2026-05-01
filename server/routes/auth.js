const express = require("express");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const sanitize = (user) => ({
  id: user.id,
  email: user.email,
  first_name: user.first_name,
  last_name: user.last_name,
  role: user.role,
  profile_image_url: user.profile_image_url,
});

// POST /api/auth/register
router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("first_name").trim().notEmpty().withMessage("First name required"),
    body("last_name").trim().notEmpty().withMessage("Last name required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    const { email, password, first_name, last_name } = req.body;
    try {
      const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
      if (existing.length > 0) {
        return res.status(409).json({ error: "Email already registered" });
      }
      const hash = await bcrypt.hash(password, 10);
      const [result] = await pool.query(
        "INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, 'student')",
        [email, hash, first_name, last_name]
      );
      const user = {
        id: result.insertId,
        email,
        first_name,
        last_name,
        role: "student",
        profile_image_url: null,
      };
      req.session.user = user;
      res.status(201).json({ user });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ error: "Registration failed" });
    }
  }
);

// POST /api/auth/login
router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    const { email, password } = req.body;
    try {
      const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
      if (rows.length === 0) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const user = rows[0];
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      req.session.user = sanitize(user);
      res.json({ user: req.session.user });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Login failed" });
    }
  }
);

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out" });
  });
});

// GET /api/auth/me — current authenticated user (incl. tutor profile if any)
router.get("/me", requireAuth, async (req, res) => {
  try {
    const [users] = await pool.query("SELECT * FROM users WHERE id = ?", [req.user.id]);
    if (users.length === 0) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "User no longer exists" });
    }
    const user = sanitize(users[0]);
    const [profiles] = await pool.query(
      "SELECT id, bio, status, gpa, created_at FROM tutor_profiles WHERE user_id = ?",
      [user.id]
    );
    user.tutor_profile = profiles[0] || null;
    res.json({ user });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

module.exports = router;
