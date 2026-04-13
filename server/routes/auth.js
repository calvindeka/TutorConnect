const express = require("express");
const { body, validationResult } = require("express-validator");
const pool = require("../config/db");

const router = express.Router();

// POST /auth/login
// If email exists, log them in. If not, create the user and log them in.
router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("name").trim().notEmpty().withMessage("Name is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, name } = req.body;

    try {
      // Check if user exists
      const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);

      let user;
      if (rows.length > 0) {
        user = rows[0];
        // Update name if it changed
        if (user.name !== name) {
          await pool.query("UPDATE users SET name = ? WHERE id = ?", [name, user.id]);
          user.name = name;
        }
      } else {
        // Create new user
        const [result] = await pool.query(
          "INSERT INTO users (email, name) VALUES (?, ?)",
          [email, name]
        );
        user = { id: result.insertId, email, name };
      }

      // Store user in session (server-side)
      req.session.user = {
        id: user.id,
        email: user.email,
        name: user.name,
      };

      res.json({
        message: "Login successful",
        user: req.session.user,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  }
);

// POST /auth/logout
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out successfully" });
  });
});

module.exports = router;
