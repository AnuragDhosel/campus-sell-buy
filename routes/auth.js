/**
 * @file routes/auth.js
 * @description Authentication routes. Maps HTTP verbs + paths to controllers.
 *
 * Route Design (thin router, fat controller):
 * The router's ONLY job is to map a URL + HTTP method to a controller function.
 * All business logic lives in /controllers/authController.js.
 *
 * Base path (set in server.js): /api/auth
 * Full endpoints:
 *   POST /api/auth/signup  → Creates a new user account.
 *   POST /api/auth/login   → Authenticates a user, returns JWT.
 */

const express            = require('express');
const { signup, login }  = require('../controllers/authController');

const router = express.Router();

// ── POST /api/auth/signup ──────────────────────────────────────────────────
// Public route — no token required.
// Registers a new user and returns a JWT on success.
router.post('/signup', signup);

// ── POST /api/auth/login ───────────────────────────────────────────────────
// Public route — no token required.
// Authenticates credentials and returns a JWT on success.
router.post('/login', login);

module.exports = router;
