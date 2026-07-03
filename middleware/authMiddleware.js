/**
 * @file middleware/authMiddleware.js
 * @description Protects private routes by verifying the JWT.
 *
 * How it works:
 * 1. Intercepts every request to a protected route.
 * 2. Reads the Authorization header for a "Bearer <token>" value.
 * 3. Verifies the token's signature and expiry using the JWT secret.
 * 4. Fetches the matching user from MongoDB (without the password).
 * 5. Attaches the user object to `req.user` so all downstream
 *    controllers can access the authenticated user's data.
 * 6. On any failure (missing token, expired, invalid), returns 401.
 */

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/**
 * @middleware protect
 * @description Validates the Bearer JWT and populates req.user.
 * Apply this middleware to any route that requires a logged-in user.
 */
const protect = async (req, res, next) => {
  let token;

  // ── Step 1: Extract Token from Header ───────────────────────────────────────
  // The Authorization header must follow the format: "Bearer eyJhbGci..."
  // req.headers.authorization gives us the full string; we split on the space
  // and grab the second element (index 1) — the actual token.
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // ── Step 2: Handle Missing Token ────────────────────────────────────────────
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. No token provided.',
    });
  }

  // ── Step 3: Verify Token & Fetch User ───────────────────────────────────────
  try {
    // jwt.verify() does two things simultaneously:
    //   a) Checks the token's signature against our JWT_SECRET.
    //   b) Checks the token's expiry (exp claim).
    // If either check fails, it throws an error caught below.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch the full user from DB using the `id` we stored in the JWT payload.
    // `.select('-password')` explicitly excludes the password field as a
    // secondary safety layer (the schema already has select: false, but
    // being explicit here is defensive programming).
    req.user = await User.findById(decoded.id).select('-password');

    // Guard: If the user was deleted after the token was issued, their DB
    // record won't exist. Reject the request rather than attaching null.
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. User belonging to this token no longer exists.',
      });
    }

    // ── Step 4: Pass Control to the Next Middleware / Route Handler ───────────
    next();
  } catch (error) {
    // jwt.verify() throws these specific error types:
    //   - JsonWebTokenError : token is malformed or has an invalid signature.
    //   - TokenExpiredError  : token's `exp` timestamp has passed.
    // Both cases are treated as unauthorized — do NOT leak which one failed.
    console.error(`Auth Middleware Error: ${error.message}`);
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Token is invalid or has expired.',
    });
  }
};

module.exports = { protect };
