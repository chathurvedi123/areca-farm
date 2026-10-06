// ============================================================
// middleware/auth.js
// PURPOSE: Protect routes so only logged-in users can access
//
// STEP BY STEP:
// 1. protect() — checks if request has valid JWT token
//    - Read Authorization header → "Bearer eyJhbGc..."
//    - Extract token part after "Bearer "
//    - Verify token using JWT_SECRET
//    - Find user in MongoDB using decoded ID
//    - Attach user to req.user so routes can use it
//
// 2. requireRole() — checks if user has correct role
//    - Called as requireRole("owner") or requireRole("manager")
//    - Returns 403 if role doesn't match
//
// HOW IT WORKS IN ROUTES:
//   router.get("/stats", protect, requireRole("owner"), handler)
//   protect runs first → requireRole runs second → handler runs last
// ============================================================

const jwt      = require("jsonwebtoken");
const User     = require("../models/User");

// ── Middleware 1: Verify JWT token ─────────────────────────
const protect = async (req, res, next) => {
  let token;

  // Check if Authorization header exists and starts with "Bearer"
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Extract token: "Bearer eyJhbGc..." → "eyJhbGc..."
      token = req.headers.authorization.split(" ")[1];

      // Verify token using secret key
      // If token is expired or tampered → throws error
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user from DB using ID inside the token
      // .select("-password") means don't return password field
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ error: "User not found" });
      }

      next(); // Token valid → continue to route handler
    } catch (err) {
      return res.status(401).json({ error: "Token invalid or expired" });
    }
  } else {
    return res.status(401).json({ error: "No token, access denied" });
  }
};

// ── Middleware 2: Check user role ──────────────────────────
// Usage: requireRole("owner") or requireRole("owner", "manager")
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(" or ")}`,
      });
    }
    next(); // Role matches → continue
  };
};

module.exports = { protect, requireRole };