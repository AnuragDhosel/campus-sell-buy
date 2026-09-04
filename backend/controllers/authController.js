/**
 * @file controllers/authController.js
 * @description Business logic for user authentication.
 *
 * Controllers:
 *   1. signup         -> POST /api/auth/signup
 *   2. login          -> POST /api/auth/login
 *   3. getMe          -> GET  /api/auth/me        (Protected)
 *   4. logout         -> POST /api/auth/logout    (Protected)
 *   5. forgotPassword -> POST /api/auth/forgot-password
 *   6. verifyOtp      -> POST /api/auth/verify-otp
 *   7. resetPassword  -> POST /api/auth/reset-password
 */

const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const crypto    = require('crypto');
const User      = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const otpEmail  = require('../templates/otpEmail');

// Helper: generate JWT
const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });


// ── Signup ────────────────────────────────────────────────────────────────────
const signup = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide name, email, and password.' });
  }
  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = await User.create({ name, email, password: hashedPassword });
    const token = generateToken(user._id, user.role);
    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Signup Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error during registration. Please try again.' });
  }
};


// ── Login ─────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide an email and password.' });
  }
  try {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    const token = generateToken(user._id, user.role);
    res.status(200).json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error during login. Please try again.' });
  }
};


// ── Get Me ────────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role },
    });
  } catch (error) {
    console.error('GetMe Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error while fetching user profile.' });
  }
};


// ── Logout ────────────────────────────────────────────────────────────────────
const logout = async (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
};


// ── Forgot Password — Send OTP ────────────────────────────────────────────────
/**
 * @route   POST /api/auth/forgot-password
 * @desc    Generates a 6-digit OTP, bcrypt-hashes it, stores hash + expiry (10 min),
 *          and sends the plain OTP to the user via email.
 *          Returns a GENERIC response whether the email exists or not (prevents enumeration).
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email || !email.trim()) {
    return res.status(400).json({ success: false, message: 'Please provide an email address.' });
  }

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      // Generic — do not reveal that the email is not registered
      return res.status(200).json({
        success: true,
        message: 'If an account with this email exists, an OTP has been sent.',
      });
    }

    // Generate a cryptographically secure 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 999999).toString().padStart(6, '0');

    // Hash before storing — never save plain OTP in DB
    const salt      = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(rawOtp, salt);

    user.resetOtp            = hashedOtp;
    user.resetOtpExpire      = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.resetOtpToken       = undefined;
    user.resetOtpTokenExpire = undefined;
    await user.save({ validateBeforeSave: false });

    const timeFormatted = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const htmlContent = otpEmail({ userName: user.name, otp: rawOtp, timeStr: timeFormatted });

    // console.log('User email:', user.email);
    try {
      await sendEmail({
        to: user.email,
        subject: `Campus Marketplace — Password Reset OTP [${timeFormatted}]`,
        html: htmlContent,
      });
    } catch (emailError) {
      console.error('OTP Email Error:', emailError.message);
      user.resetOtp       = undefined;
      user.resetOtpExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again later.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'If an account with this email exists, an OTP has been sent.',
    });

  } catch (error) {
    console.error('Forgot Password Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
};


// ── Verify OTP ────────────────────────────────────────────────────────────────
/**
 * @route   POST /api/auth/verify-otp
 * @desc    Validates the 6-digit OTP and its expiry.
 *          On success: clears OTP, generates a short-lived reset token (15 min),
 *          stores its bcrypt hash, and returns the raw token to the frontend.
 */
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  const cleanOtp = String(otp || '').replace(/\D/g, '').trim();

  if (!email || !cleanOtp) {
    return res.status(400).json({ success: false, message: 'Please provide both email and OTP.' });
  }
  if (cleanOtp.length !== 6) {
    return res.status(400).json({ success: false, message: 'OTP must be exactly 6 digits.' });
  }

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() })
      .select('+resetOtp +resetOtpExpire');

    if (!user || !user.resetOtp || !user.resetOtpExpire) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP. Please request a new one.',
      });
    }

    // Check expiry
    if (new Date() > user.resetOtpExpire) {
      user.resetOtp       = undefined;
      user.resetOtpExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      });
    }

    // Verify OTP
    const isValid = await bcrypt.compare(cleanOtp, user.resetOtp);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect OTP. Please check your newest email and enter the latest 6-digit code.',
      });
    }

    // OTP verified — generate reset token
    const rawResetToken    = crypto.randomBytes(32).toString('hex');
    const resetSalt        = await bcrypt.genSalt(10);
    const hashedResetToken = await bcrypt.hash(rawResetToken, resetSalt);

    user.resetOtp            = undefined;
    user.resetOtpExpire      = undefined;
    user.resetOtpToken       = hashedResetToken;
    user.resetOtpTokenExpire = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully.',
      resetToken: rawResetToken,
    });

  } catch (error) {
    console.error('Verify OTP Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
};


// ── Reset Password ────────────────────────────────────────────────────────────
/**
 * @route   POST /api/auth/reset-password
 * @desc    Accepts { resetToken, newPassword }.
 *          Finds the user whose stored reset-token hash matches, hashes the new password,
 *          saves it, and clears all OTP/reset fields (single-use guarantee).
 */
const resetPassword = async (req, res) => {
  const { resetToken, newPassword } = req.body;

  if (!resetToken || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Please provide both reset token and new password.',
    });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 6 characters.',
    });
  }

  try {
    // Fetch all users with a non-expired reset token.
    // bcrypt hashes are non-deterministic so we cannot query by hash —
    // we iterate candidates and use bcrypt.compare to find the match.
    // resetOtpTokenExpire > currentTime 
    //     means: Find users whose reset token has not expired yet.
    const candidates = await User.find({ resetOtpTokenExpire: 
                                          { $gt: new Date() },  
                                      })
                                      .select('+resetOtpToken +resetOtpTokenExpire');

    // we used loop bcz we store the hashed reset token in the database, and bcrypt hashes are non-deterministic.
    let matchedUser = null;
    for (const candidate of candidates) {
      if (candidate.resetOtpToken) {
        const isMatch = await bcrypt.compare(resetToken, candidate.resetOtpToken);
        if (isMatch) {
          matchedUser = candidate;
          break;
        }
      }
    }

    if (!matchedUser) {
      return res.status(400).json({
        success: false,
        message: 'Reset token is invalid or has expired. Please start over.',
      });
    }

    // Hash new password
    const salt           = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update and clear all reset fields (token becomes single-use)
    matchedUser.password            = hashedPassword;
    matchedUser.resetOtp            = undefined;
    matchedUser.resetOtpExpire      = undefined;
    matchedUser.resetOtpToken       = undefined;
    matchedUser.resetOtpTokenExpire = undefined;
    await matchedUser.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. Please log in with your new password.',
    });

  } catch (error) {
    console.error('Reset Password Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error during password reset. Please try again.' });
  }
};


module.exports = { signup, login, getMe, logout, forgotPassword, verifyOtp, resetPassword };
