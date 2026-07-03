/**
 * @file controllers/authController.js
 * @description Business logic for user registration and login.
 *
 * Design Decisions:
 * - bcryptjs salt rounds set to 12 (industry standard: 10–12).
 *   Higher = more secure but slower. 12 is a good balance.
 * - JWT payload contains ONLY `id` and `role` — the minimum needed.
 *   Never store sensitive data (email, password) in a JWT payload.
 * - Token expiry is read from .env, defaulting to '7d' if not set.
 * - On login failure, BOTH "email not found" and "wrong password"
 *   return the SAME generic message to prevent user enumeration attacks.
 */

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');

// ─── Helper: Token Generator ─────────────────────────────────────────────────

/**
 * Generates a signed JWT for a given user.
 * @param {string} id   - MongoDB ObjectId of the user.
 * @param {string} role - Role of the user ('user' | 'admin').
 * @returns {string}    - Signed JWT string.
 */
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '7d',
    }
  );
};


// ─── Controller: Signup ──────────────────────────────────────────────────────

/**
 * @controller signup
 * @route   POST /api/auth/signup
 * @access  Public
 * @desc    Registers a new user, hashes their password, and returns a JWT.
 */
const signup = async (req, res) => {
  // ── Step 1: Extract & Validate Input ──────────────────────────────────────
  const { name, email, password } = req.body;

  // Basic field-presence check (Mongoose validators will catch type/format errors).
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide name, email, and password.',
    });
  }

  try {
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const salt = await bcrypt.genSalt(12); // generate a random string
    // suppose it generate a salt :- Salt = ABC123  , every time it generate new random string
    const hashedPassword = await bcrypt.hash(password, salt); // add that random string into password and generate hashed password
    // suppose you enter password = hello123 , then bcrypt.hash() -> combine salt + password -> generate hashed password and this hashed password store in db

    // ── Step 4: Create & Save User 
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword, // Never save the plain-text password
    });

    // ── Step 5: Generate JWT & Respond 
    const token = generateToken(newUser._id, newUser.role);

    // Return the token and a safe subset of user data (no password).
    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id:    newUser._id,
        name:  newUser.name,
        email: newUser.email,
        role:  newUser.role,
      },
    });
  } catch (error) {
    // Catch unexpected DB or hashing errors.
    console.error(`Signup Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error during registration. Please try again.',
    });
  }
};


// ─── Controller: Login ───────────────────────────────────────────────────────

/**
 * @controller login
 * @route   POST /api/auth/login
 * @access  Public
 * @desc    Authenticates a user and returns a JWT.
 *
 * CRITICAL SECURITY: Both "email not found" and "wrong password" cases
 * return the EXACT same 401 response. This prevents "user enumeration" —
 * an attack where the differences in API responses reveal whether an
 * email address is registered on the platform.
 */
const login = async (req, res) => {
  // ── Step 1: Extract Input ────────────────────────────────────────────────
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide an email and password.',
    });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    // return all the info with this email include password

    // ── Step 3: Generic Failure (Email not found) 
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // ── Step 4: Verify Password ──────────────────────────────────────────────
    const isPasswordMatch = await bcrypt.compare(password, user.password);
//  Suppose your database contains: Stored Hash = $2b$12$ABC123........XYZ999
//  Inside this stored hash is: Cost = 12 and Salt = ABC123
//  Now bcrypt does: bcrypt combine entered_password and salt -> generate hashed password
//  if this match, return true otherwise false


    // ── Step 5: Generic Failure (Wrong password) ─────────────────────────────
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.', // Same message — by design.
      });
    }

    // ── Step 6: Generate JWT & Respond ──────────────────────────────────────
    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        role:  user.role,
      },
    });
  } catch (error) {
    console.error(`Login Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error during login. Please try again.',
    });
  }
};

module.exports = { signup, login };
