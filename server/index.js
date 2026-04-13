const express = require("express");
const cors = require("cors");
const session = require("express-session");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/auth");

const app = express();

// Middleware
app.use(cors({
  origin: ["http://localhost:5173", "http://10.192.145.179:4131"],
  credentials: true,
}));
app.use(express.json());

// Session middleware — server-side sessions with cookie
app.use(session({
  secret: process.env.SESSION_SECRET || "tutorconnect-session-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
}));

// API Routes
app.use("/auth", authRoutes);

// Authenticated API route — shows current user
app.get("/api/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Not logged in" });
  }
  res.json({ user: req.session.user });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve React frontend (production build)
const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

const PORT = process.env.PORT || 4131;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`TutorConnect running on http://10.192.145.179:${PORT}`);
});
