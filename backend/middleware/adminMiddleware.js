/**
 * @file middleware/adminMiddleware.js
 * @description Role-Based Access Control (RBAC) middleware for admin-only routes.
 *
 * IMPORTANT: This middleware must ALWAYS be used AFTER `protect`.
 * The `protect` middleware populates `req.user`; this middleware reads from it.
 *
 * Usage on a route:
 *   router.get('/admin-only', protect, adminOnly, controllerFn);
 *
 * Flow:
 *   Request → protect (verifies JWT, sets req.user) → adminOnly (checks role) → Controller
 */

/**
 * @middleware adminOnly
 * @description Grants access only if `req.user.role === 'admin'`.
 * Returns 403 Forbidden for any authenticated non-admin user.
 */
const adminOnly = (req, res, next) => {
  // `req.user` is guaranteed to exist here because `protect` runs first.
  // If somehow it doesn't (middleware misconfiguration), we guard against it.
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Please log in first.',
    });
  }

  // ── Role Check ───────────────────────────────────────────────────────────────
  if (req.user.role === 'admin') {
    // User is an admin — pass control to the next handler.
    next();
  } else {
    // User is authenticated but not an admin.
    // Return 403 Forbidden (distinct from 401 Unauthorized).
    // 401 = "Who are you?" | 403 = "I know who you are, but you can't go in."
    return res.status(403).json({
      success: false,
      message: 'Access Denied. This route is restricted to administrators only.',
    });
  }
};

module.exports = { adminOnly };
