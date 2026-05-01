// Session-based auth middleware. The Auth assignment explicitly says no JWT
// requirement, and the existing scaffold already wires express-session.

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  req.user = req.session.user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    req.user = req.session.user;
    next();
  };
}

module.exports = { requireAuth, requireRole };
