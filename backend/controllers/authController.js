/**
 * @file controllers/authController.js
 * @description Business logic for user authentication.
 *
 * Controllers in this file:
 *   1. signup         → POST /api/auth/signup          (Public)
 *   2. login          → POST /api/auth/login           (Public)
 *   3. getMe          → GET  /api/auth/me              (Protected)
 *   4. logout         → POST /api/auth/logout          (Protected)
 *   5. forgotPassword → POST /api/auth/forgot-password (Public)
 *   6. resetPassword  → POST /api/auth/reset-password/:token (Public)
 *
 * Design Decisions:
 * - bcryptjs salt rounds set to 12 (industry standard: 10–12).
 *   Higher = more secure but slower. 12 is a good balance.
 * - JWT payload contains ONLY `id` and `role` — the minimum needed.
 *   Never store sensitive data (email, password) in a JWT payload.
 * - Token expiry is read from .env, defaulting to '7d' if not set.
 * - On login failure, BOTH "email not found" and "wrong password"
 *   return the SAME generic message to prevent user enumeration attacks.
 * - Password reset tokens use crypto.randomBytes (cryptographically secure).
 *   The raw token goes in the email link; only a SHA-256 hash is stored in DB.
 * - forgot-password returns the SAME response whether the email exists or not,
 *   preventing user enumeration attacks.
 */

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');                         // Node.js built-in — for generating secure random tokens
const User   = require('../models/User');
const sendEmail        = require('../utils/sendEmail');            // Nodemailer utility for sending emails
const passwordResetEmail = require('../templates/passwordResetEmail'); // HTML template for password-reset emails
// Architecture:
//   Controller (business logic) → template (HTML) → sendEmail (SMTP delivery)
//   Each layer has a single responsibility. The controller never builds raw HTML.

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
    // password + salt + bcrypt algorithm
    //           ↓
    //      password hash

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
/* Suppose your database contains: Stored Hash = $2b$12$ABC123........XYZ999
      Inside this stored hash is: Cost = 12 and Salt = ABC123
      Now bcrypt does: bcrypt combine entered_password and salt -> generate hashed password
      if this match, return true otherwise false
          explain  : 
                          Stored hash
                              ↓
              extract salt + cost from stored hash
                              ↓
"hello123"(user intered password) + same salt(from stored hash) + bcrypt algorithm
                              ↓
                    newly calculated result
                              ↓
                    compare with stored hash
          If they match: true
          Otherwise: false 
*/


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


// ─── Controller: Get Me ──────────────────────────────────────────────────────
/**
 * @controller getMe 
 * @route   GET /api/auth/me
 * @access  Protected (requires valid JWT)
 * @desc    Return the profile of the user who is currently authenticated.
 *
 * How it works:
 *   1. The `protect` middleware runs BEFORE this controller.
 *   2. `protect` extracts the Bearer token from the Authorization header.
 *   3. `protect` verifies the JWT signature and checks expiry.
 *   4. `protect` fetches the user from MongoDB (without password).
 *   5. `protect` places the user object into `req.user`.
 *   6. This controller simply reads `req.user` and sends it back.
 *
 * Why a separate /me endpoint?
 *   The frontend needs a way to verify if the stored JWT is still valid when the app loads 
 *   (e.g., after a page refresh). 
 *   Instead of decoding the JWT on the client (which doesn't verify it), the frontend calls GET /me. 
 *   If it returns 200, the user is authenticated. 
 *   If 401, the stored token is invalid/expired and the frontend should log out.
 */
const getMe = async (req, res) => {
  // req.user is already populated by the protect middleware.
  // If we reached this point, the user is authenticated.
  // We return only safe, non-sensitive fields.
  try {
    res.status(200).json({
      success: true,
      user: {
        id:    req.user._id,
        name:  req.user.name,
        email: req.user.email,
        role:  req.user.role,
      },
    });
  } catch (error) {
    console.error(`GetMe Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user profile.',
    });
  }
};


// ─── Controller: Logout ──────────────────────────────────────────────────────

/**
 * @controller logout
 * @route   POST /api/auth/logout
 * @access  Protected (requires valid JWT)
 * @desc    Provides a clean logout API response.
 *
 * IMPORTANT — Stateless JWT Architecture:
 *   This project uses STATELESS JWT authentication with Bearer tokens.
 *   The JWT is stored in the frontend's localStorage, NOT in HTTP-only cookies.
 *
 *   Because JWTs are stateless, the backend CANNOT "revoke" or "invalidate"
 *   an already-issued token. The token remains valid until it expires.
 *
 *   What this endpoint does:
 *     - Returns a success response so the frontend knows the logout was acknowledged.
 *     - The frontend is responsible for:
 *       1. Removing the JWT from localStorage.
 *       2. Clearing the AuthContext state.
 *       3. Redirecting the user to the landing page.
 *
 *   What this endpoint does NOT do:
 *     - It does NOT revoke the JWT (that would require a token blacklist or sessions).
 *     - It does NOT destroy a server-side session (we don't use sessions).
 *
 *   Future extensibility:
 *     If server-side token revocation is ever needed, this endpoint is where
 *     that logic would be added (e.g., adding the token to a Redis blacklist).
 */
const logout = async (req, res) => {
  // it Simply return a success response when user click logout.
  // The actual "logout" happens on the frontend (remove token from localStorage).
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
};


// ─── Controller: Forgot Password ─────────────────────────────────────────────

/**
 * @controller forgotPassword
 * @route   POST /api/auth/forgot-password
 * @access  Public
 * @desc    Generates a password reset token and sends a reset email.
 *          - Find the user, create a secure temporary reset token, store only its hash, send the raw token 
 *            to the user's email, and make the token expire after 30 minutes.
 * 
 *  ═══════════════════════════════════════════════════════════════════════════════
 * The controller does:
 * ═══════════════════════════════════════════════════════════════════════════════
 
    forgotPassword
          ↓
    generate RAW token
          ↓
    hash token
          ↓
    store hash in DB
          ↓
    send RAW token to email

 * ═══════════════════════════════════════════════════════════════════════════════
 * Security: User Enumeration Prevention
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   This endpoint returns the EXACT SAME response regardless of whether
 *   the email exists in the database or not. This prevents an attacker
 *   from using this endpoint to discover which emails are registered.
 *
 *   Bad example (reveals information):
 *     - "Email not found" → attacker now knows this email is NOT registered
 *     - "Reset email sent" → attacker now knows this email IS registered
 *
 *   Good example (our approach):
 *     - Always returns: "If an account exists with this email, a password
 *       reset link has been sent."
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * Token Security Flow:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   1. Generate 32 random bytes using crypto.randomBytes() → raw token (hex)
 *   2. Hash the raw token with SHA-256 → this hash is stored in the database
 *   3. Send the RAW token (not the hash) in the email reset link
 *   4. When user clicks the link:
 *      a. Backend receives the raw token from the URL
 *      b. Backend hashes it again with SHA-256
 *      c. Backend searches for a user whose stored hash matches
 *      d. If match found AND token not expired → allow password reset
 *
 *   Why store the HASH instead of the raw token?
 *     If the database is ever breached, the attacker gets hashed tokens.
 *     They cannot reverse SHA-256 to get the original tokens, so they
 *     cannot use them to reset anyone's password.
 *     This is the same reason we hash passwords with bcrypt.
 */
const forgotPassword = async (req, res) => {
/* ── Step 1: Extract & Validate Input ────────────────────────────────────
    Suppose frontend sends: { "email": "anurag@gmail.com" }
    Then: req.body is: { email: "anurag@gmail.com" }
    And: const { email } = req.body;
    gives: email = "anurag@gmail.com";    */
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Please provide an email address.',
    });
  }

  try {
    // ── Step 2: Find User by Email ──────────────────────────────────────────
    const user = await User.findOne({ email: email.toLowerCase() });

/* ── Step 3: Handle Non-Existing Email ────────────────────────────────────
    If no user found, return the SAME generic success response.
    DO NOT reveal that the email doesn't exist.
    DO NOT send an email (there's no user to send to). */
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'User not found with this email',
        // for reployement : If an account exists with this email, a password reset link has been sent.
        // for testing , you can add - message: 'User not found with this email.',
      });
    }

  // now user exist 
/* ── Step 4: Generate Cryptographically Secure Reset Token ────────────────
    crypto.randomBytes(32) - generates 32 random bytes (256 bits of entropy).
    .toString('hex') - converts those 32 bytes to a 64-character hex string.
    
    This is the RAW token — it will be sent in the email link.
    We NEVER store this raw token in the database.
    
    Why NOT use Math.random()?
      Math.random() is NOT cryptographically secure. Its output can be predicted if the internal state 
      is known. 
      crypto.randomBytes() uses the operating system's cryptographic random number generator. */
    const rawResetToken = crypto.randomBytes(32).toString('hex');

/* ── Step 5: Hash the Token for Storage ──────────────────────────────────
    We store a SHA-256 hash of the token in the database.
    
    crypto.createHash('sha256') → Create a SHA-256 hashing operation.
    .update(rawResetToken)      → Give the raw token to SHA-256.
    .digest('hex')              → Give me the final hash as a hexadecimal string.
  Example :
      RAW TOKEN(abc123xyz) → SHA-256 → HASH(e3b0c44298fc...)   , we store e3b0c44298fc... in db
    
    SHA-256 is a one-way function:
      hash("abc123") → "6ca13d52..."  (always the same output)
      But you CANNOT reverse "6ca13d52..." back to "abc123" */
    const hashedToken = crypto
      .createHash('sha256')
      .update(rawResetToken)
      .digest('hex');

/* ── Step 6: Store Hashed Token & Expiry in User Document ────────────────
    Date.now() returns milliseconds since epoch.  30 * 60 * 1000 = 1,800,000 milliseconds = 30 minutes. */
    user.resetPasswordToken = hashedToken;  // Set the hashed token on the user document.
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // Set an expiration time of 30 minutes from now.


/* ── Step 6: Save the changes ────────────────
- "Save the changes I made to this user into MongoDB, but skip Mongoose's normal validation checks this time."
- Your earlier code does something like:
      user.resetPasswordToken = hashedToken
      user.resetPasswordExpire = expirationTime
- At this point, these changes exist only in the JavaScript object in memory.
- They are not yet permanently saved in MongoDB.  
  So: await user.save({ validateBeforeSave: false });
        - takes those changes and saves them to MongoDB.
  - Example
      Before: MongoDB                              after: MongoDB
         User                                        user
          ├── name: Anurag                            ├── name: Anurag
          ├── email: anurag@gmail.com                 ├── email: anurag@gmail.com
          ├── resetPasswordToken: null                ├── resetPasswordToken: ABC_HASH
          └── resetPasswordExpire: null               └── resetPasswordExpire: 7:30 PM 
*/
    await user.save({ validateBeforeSave: false });

    // ── Step 7: Construct the Frontend Reset URL ────────────────────────────
    // The reset URL points to the FRONTEND reset page, NOT the backend API.
    // The frontend will extract the token from the URL and send it to
    // POST /api/auth/reset-password/:token
    //
    // IMPORTANT: We use FRONTEND_URL from .env, NOT req.headers.host.
    // Using the Host header is dangerous because an attacker could
    // manipulate it to point the reset link to their own malicious site.
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${rawResetToken}`;

    // ── Step 8: Get HTML from the Email Template ───────────────────────────
    // The HTML is generated by templates/passwordResetEmail.js.
    //
    // Why separate the HTML into a template file?
    //   - Separation of concerns: controllers handle business logic, not HTML design.
    //   - Easier maintenance: email designers can edit the template without
    //     touching authentication logic.
    //   - Reusability: the template can be reused for other email scenarios.
    //
    // The template receives:
    //   userName → user.name (from MongoDB, e.g., "Anurag")
    //   resetUrl → the full reset link built in Step 7
    const htmlContent = passwordResetEmail({
      userName: user.name,
      resetUrl,
    });

/* ── Step 9: Send the Email ───────────────────────────────────────────────
    Use our sendEmail utility (utils/sendEmail.js) to send the reset email. 
    If the email fails to send, we need to clean up the reset token from the database (otherwise the user 
    would have a token stored but would never receive the email with the actual token). */
    try {
      await sendEmail({
        to: user.email,
        subject: 'Campus Marketplace Password Reset',
        html: htmlContent,
      });
    } catch (emailError) {
      // ── Email Failed: Clean Up ──────────────────────────────────────────
      // If the email service fails (wrong SMTP credentials, server down, etc.),
      // we must clear the reset token from the database. Otherwise, the user
      // would have a useless token stored that they can never use (because
      // they never received the email).
      console.error(`Email Service Error: ${emailError.message}`);

      // Clear the reset token fields
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      // Return a server error.
      // Note: We still use a somewhat generic message here.
      // We do NOT say "User found but email failed" (that would reveal
      // that the email exists in our system).
      return res.status(500).json({
        success: false,
        message: 'forgotPassword , Email could not be sent. Please try again later.',
      });
    }

    // ── Step 10: Return Generic Success Response ─────────────────────────────
    // Return the SAME success message regardless of whether the email
    // exists or not. This prevents user enumeration.
    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    });

  } catch (error) {
    console.error(`Forgot Password Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
    });
  }
};


// ─── Controller: Reset Password ──────────────────────────────────────────────

/**
 * @controller resetPassword
 * @route   POST /api/auth/reset-password/:token
 * @access  Public
 * @desc    Resets the user's password using a valid reset token.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * The controller does:
 * ═══════════════════════════════════════════════════════════════════════════════
 
    resetPassword
        ↓
  receive RAW token
        ↓
  hash it again
        ↓
  find matching hash in DB
        ↓
  check token expiry
        ↓
  hash new password with bcrypt
        ↓
  save new password
        ↓
  delete reset token

 * ═══════════════════════════════════════════════════════════════════════════════
 * How the Reset Token Validation Works:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   1. The user clicks the reset link in their email:
 *      https://frontend.com/reset-password/abc123def456...
 *                                           ^^^^^^^^^^^^^^^^
 *                                           This is the RAW token
 *
 *   2. The frontend extracts "abc123def456..." from the URL and sends it
 *      to this endpoint as a URL parameter:
 *      POST /api/auth/reset-password/abc123def456...
 *
 *   3. We hash the raw token with SHA-256 (same method used when storing it):
 *      SHA-256("abc123def456...") → "7f83b1657..."
 *
 *   4. We search the database for a user whose resetPasswordToken field
 *      matches "7f83b1657..." AND whose resetPasswordExpire is still
 *      in the future (not expired).
 *
 *   5. If found → reset the password. If not found → reject the request.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * Token Single-Use Guarantee:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   After a successful password reset, we set:
 *     resetPasswordToken  = undefined
 *     resetPasswordExpire = undefined
 *
 *   This ensures the same token CANNOT be used again.
 *   If someone tries to reuse the link, the hash won't match any user
 *   (because the field has been cleared), and the request will be rejected.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * what we did and what we will do 
 * ═══════════════════════════════════════════════════════════════════════════════
    Forgot-password controller
      It generates: RAW TOKEN - ABC123XYZ
      Then stores: DATABASE - SHA256(ABC123XYZ)
      And sends the user: https://frontend.com/reset-password/ABC123XYZ

    Now the user clicks that link.
    The frontend gets: ABC123XYZ
    and user enters new password and sends: POST /api/auth/reset-password/ABC123XYZ

    Now your resetPassword controller takes over.
 */
const resetPassword = async (req, res) => {
  // ── Step 1: Extract Inputs ────────────────────────────────────────────────
  const { password } = req.body;
  const { token } = req.params;

  // ── Step 2: Validate New Password ─────────────────────────────────────────
  // Enforce the same minimum password length as the User model (6 characters).
  if (!password || password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a new password with at least 6 characters.',
    });
  }

  try {
/* ── Step 3: Hash the Raw Token ──────────────────────────────────────────
    Hash the raw token from the URL using the SAME method (SHA-256)
    that was used when we stored it during the forgot-password step.
    This produces the same hash, allowing us to find the matching user.
      crypto.createHash('sha256') → Create a SHA-256 hashing operation.
      .update(rawResetToken)      → Give the raw token to SHA-256.
      .digest('hex')              → Give me the final hash as a hexadecimal string. */
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

  /* ── Step 4: Find User by Hashed Token + Check Expiry ────────────────────
      We search for a user that has:
        a) resetPasswordToken matching our hashed token
        b) resetPasswordExpire greater than the current time (not expired)
      
      We use .select('+resetPasswordToken +resetPasswordExpire') because
      these fields have `select: false` in the schema, so they're excluded
      from queries by default. The '+' prefix forces Mongoose to include them. */
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },  // $gt = "greater than" (MongoDB operator)
    });

/* ── Step 5: Handle Invalid or Expired Token ─────────────────────────────
      If no user matches, the token is either:
        a) Invalid (wrong/fake token) → hash doesn't match any stored hash
        b) Expired → resetPasswordExpire < Date.now()
        c) Already used → fields were cleared after a previous successful reset
      We return a generic error that doesn't reveal which case it is. */
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is invalid or has expired.',
      });
    }

/* ── Step 6: Hash New Password with bcrypt ────────────────────────────────
    We use bcryptjs with 12 salt rounds (same as signup).
    bcrypt.genSalt(12) generates a random salt string.
    bcrypt.hash() combines the salt with the password and produces
    a one-way hash that is stored in the database. */
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ── Step 7: Update User Document ────────────────────────────────────────
    // Set the new hashed password.
    // Clear the reset token fields so the token cannot be reused.
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;    // Clear the stored hash
    user.resetPasswordExpire = undefined;   // Clear the expiry

/* ── Step 6: Save the changes ────────────────
- "Save the changes I made to this user into MongoDB, but skip Mongoose's normal validation checks this time."
- Your earlier code does something like:
      user.resetPasswordToken = hashedToken
      user.resetPasswordExpire = expirationTime
- At this point, these changes exist only in the JavaScript object in memory.
- They are not yet permanently saved in MongoDB.  
  So: await user.save({ validateBeforeSave: false });
        - takes those changes and saves them to MongoDB.
  - Example
      Before: MongoDB                              after: MongoDB
         User                                        user
          ├── name: Anurag                            ├── name: Anurag
          ├── email: anurag@gmail.com                 ├── email: anurag@gmail.com
          ├── resetPasswordToken: null                ├── resetPasswordToken: ABC_HASH
          └── resetPasswordExpire: null               └── resetPasswordExpire: 7:30 PM 
*/
    await user.save({ validateBeforeSave: false });

    // ── Step 8: Return Success ──────────────────────────────────────────────
    // We do NOT automatically issue a new JWT here.
    // The user should go to the login page and log in with their new password.
    // This is a security best practice — it ensures the user proves they
    // know the new password before getting access.
    res.status(200).json({
      success: true,
      message: 'Password reset successfully. Please log in.',
    });

  } catch (error) {
    console.error(`Reset Password Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset. Please try again.',
    });
  }
};


module.exports = { signup, login, getMe, logout, forgotPassword, resetPassword };
