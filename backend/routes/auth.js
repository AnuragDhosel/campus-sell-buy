/**
 * @file routes/auth.js
 * @description Authentication routes.
 *
 * Base path (set in server.js): /api/auth
 *
 * Full endpoints:
 *   POST /api/auth/signup            - Register a new user.              (Public)
 *   POST /api/auth/login             - Authenticate, return JWT.         (Public)
 *   GET  /api/auth/me                - Return authenticated user profile. (Protected)
 *   POST /api/auth/logout            - Acknowledge logout.               (Protected)
 *
 *   OTP-based password reset (3-step flow):
 *   POST /api/auth/forgot-password   - Step 1: Send 6-digit OTP to email.        (Public)
 *   POST /api/auth/verify-otp        - Step 2: Verify OTP, return reset token.   (Public)
 *   POST /api/auth/reset-password    - Step 3: Submit resetToken + new password. (Public)
 */

const express = require('express');

const {
  signup,
  login,
  getMe,
  logout,
  forgotPassword,
  verifyOtp,
  resetPassword,
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');

const router = express.Router();


// ── Public Routes ────────────────────────────────────────────────────────────
router.post('/signup', signup);
router.post('/login', login);

// OTP-Based Password Reset (3 steps)
router.post('/forgot-password', forgotPassword);  // Step 1
router.post('/verify-otp', verifyOtp);            // Step 2
router.post('/reset-password', resetPassword);    // Step 3


// ── Protected Routes (JWT required) ──────────────────────────────────────────
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);


module.exports = router;
