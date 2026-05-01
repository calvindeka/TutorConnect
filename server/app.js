const express = require("express");
const cors = require("cors");
const session = require("express-session");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const tutorsRoutes = require("./routes/tutors");
const subjectsRoutes = require("./routes/subjects");
const availabilityRoutes = require("./routes/availability");
const sessionsRoutes = require("./routes/sessions");
const reviewsRoutes = require("./routes/reviews");
const dashboardRoutes = require("./routes/dashboard");
const recommendRoutes = require("./routes/recommend");

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:4131", `http://${process.env.ADVERTISED_IP || "10.192.145.179"}:4131`],
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

// Lightweight request logger so the demo console reads cleanly
app.use((req, res, next) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/auth")) {
    const start = Date.now();
    res.on("finish", () => {
      console.log(`${req.method} ${req.path} → ${res.statusCode} (${Date.now() - start}ms)`);
    });
  }
  next();
});

app.use(
  session({
    name: "tutorconnect.sid",
    secret: process.env.SESSION_SECRET || "tutorconnect-dev-secret-CHANGE-IN-PROD",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // we deploy over plain HTTP at :4131
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/tutors", tutorsRoutes);
app.use("/api/subjects", subjectsRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/sessions", sessionsRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/recommend", recommendRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve React frontend (production build) — single-port architecture per the scaffold spec
const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(clientDist, "index.html"));
});

// JSON 404 for unknown API routes
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found" });
  }
  res.status(404).send("Not found");
});

module.exports = app;
