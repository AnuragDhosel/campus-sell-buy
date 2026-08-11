/**
 * @file routes/auth.js
 * @description Authentication routes. Maps HTTP verbs + paths to controllers.
 *
 * Route Design (thin router, fat controller):
 *   The router's ONLY job is to map a URL + HTTP method to a controller function.
 *   All business logic lives in /controllers/authController.js.
 *
 * Base path (set in server.js): /api/auth
 *
 * Full endpoints:
 *   POST /api/auth/signup                → Creates a new user account.         (Public)
 *   POST /api/auth/login                 → Authenticates a user, returns JWT.  (Public)
 *   GET  /api/auth/me                    → Returns authenticated user profile. (Protected)
 *   POST /api/auth/logout                → Acknowledges logout.               (Protected)
 *   POST /api/auth/forgot-password       → Sends password reset email.        (Public)
 *   POST /api/auth/reset-password/:token → Resets password using reset token. (Public)
 *
 * Protected vs Public:
 *   - Public routes: Anyone can access them without a JWT.
 *   - Protected routes: Require a valid JWT in the Authorization header.
 *     The `protect` middleware handles JWT verification before the controller runs.
 */

const express = require('express');

// ─── Import Controllers ──────────────────────────────────────────────────────
// Each controller handles the business logic for its corresponding route.
const {
  signup,
  login,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');

// ─── Import Middleware ───────────────────────────────────────────────────────
// The `protect` middleware verifies the JWT from the Authorization header.
// It runs BEFORE the controller, and only allows the request through if
// the JWT is valid and the user exists.
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();


// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC ROUTES — No token required
// ═══════════════════════════════════════════════════════════════════════════════

/* ── POST /api/auth/signup - register new user ──────────────────────────────────────────────────
  Registers a new user and returns a JWT on success.
  Anyone can create an account — no authentication required. */
router.post('/signup', signup);

/* ── POST /api/auth/login - authenticate user ───────────────────────────────────────────────────
Authenticates credentials (email + password) and returns a JWT on success.
Anyone can attempt to log in — no authentication required. */
router.post('/login', login);

/* ── POST /api/auth/forgot-password - forgot password ─────────────────────────────────────────
        Generates a password reset token and sends a reset link via email.
        it is Public because the user has forgotten their password and can't authenticate.
        Security: Returns the SAME generic response regardless of whether
        the email exists or not (prevents user enumeration). */
router.post('/forgot-password', forgotPassword);

/* ── POST /api/auth/reset-password/:token - reset password ───────────────────────────────────
        Resets the user's password using the reset token from the email link.
        it is Public because the user received the token via email (proves identity).
        The :token URL parameter contains the RAW reset token.
        The controller hashes it and compares with the stored hash.  */ 
router.post('/reset-password/:token', resetPassword);


// ═══════════════════════════════════════════════════════════════════════════════
// PROTECTED ROUTES — Valid JWT required in Authorization header
// ═══════════════════════════════════════════════════════════════════════════════
//
// The `protect` middleware runs before the controller:
//   1. Extracts the Bearer token from the Authorization header.
//   2. Verifies the JWT signature using JWT_SECRET.
//   3. Checks the JWT expiry.
//   4. Fetches the user from MongoDB.
//   5. Places the user into req.user.
//   6. Calls next() to pass control to the controller.

// If any step fails, protect returns a 401 and the controller never runs.

/* ── GET /api/auth/me - after refresh, it checks the token ───────────────────────────────────────────────────────
        1. What problem does /me solve?
             - After login, your backend gives the frontend a JWT.
             - localStorage has token = eyJhbGciOiJIUzI1NiIs...
             - Now imagine the user refreshes the page.
             - React starts again.
                The frontend knows: "I have a token."
                But it needs to know:
                  "Is this token still valid, and which user does it belong to?"
            - That's exactly what /me is for.

        Returns the currently authenticated user's profile (id, name, email, role).
        The frontend calls this on app load to verify if the stored JWT is still valid.

        Why protect this route?
          Without protection, anyone could call /me without a token.
          The protect middleware ensures only authenticated users can access this. */
router.get('/me', protect, getMe);

/* ── POST /api/auth/logout - log out user ───────────────────────────────────────────────────
        Provides a clean logout API response.

        Why protect this route?
          Only logged-in users should be able to "log out".
          An unauthenticated request to /logout doesn't make sense.

        Note: Because this project uses stateless JWTs (no server-side sessions),
        the backend cannot actually revoke the token. The frontend is responsible
        for removing the token from localStorage and clearing AuthContext.
        This endpoint provides a clean API contract and future extensibility. */
router.post('/logout', protect, logout);


module.exports = router;
