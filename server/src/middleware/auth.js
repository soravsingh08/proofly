import jwt from "jsonwebtoken";
import passport from "../config/passport.js";

export function signToken(user) {
  // 7-day TTL — never expires mid-demo (A4)
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

// Token verification goes through the passport "jwt" strategy
// (config/passport.js). Custom callback so errors stay JSON.
export function requireAuth(req, res, next) {
  passport.authenticate("jwt", { session: false }, (err, user) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    req.user = user;
    next();
  })(req, res, next);
}

// Attach the user if a valid token is present, never block —
// lets public forms (support) tie submissions to accounts
export function optionalAuth(req, res, next) {
  passport.authenticate("jwt", { session: false }, (err, user) => {
    if (user) req.user = user;
    next();
  })(req, res, next);
}

// Most routes need a chosen role (A5)
export function requireRole(req, res, next) {
  if (!req.user.role)
    return res.status(403).json({ error: "Choose a profession first" });
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user.isAdmin)
    return res.status(403).json({ error: "Admins only" });
  next();
}
