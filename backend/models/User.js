/**
 * @file models/User.js
 * @description Mongoose schema for a platform User.
 * Handles both regular students (buyers/sellers) and admins.
 *
 * Security Note: Password is stored as a plain string here.
 * Hashing with bcryptjs will be added in Day 2 (Authentication module)
 * using a Mongoose pre-save hook.
 */

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },

    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,       // Creates a unique index in MongoDB
      lowercase: true,    // Normalizes email to lowercase before saving
      trim: true,
/* Basic email format validation using a regex
      It says: The email must follow a particular pattern.
      For example: anurag@gmail.com ✅ , john.doe@gmail.com ✅ , abc123@yahoo.in ✅
      Something like :  anurag@gma❌ , anurag.com ❌ , @gmail.com ❌ */ 
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },

    // ── Security ──────────────────────────────────────────────────────────────
    // Plain string for now. Will be replaced with bcrypt hash in Day 2.
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      // select: false prevents password from being returned in queries by default.
      // This is a critical security practice.
      select: false,
    },

    // ── Authorization ─────────────────────────────────────────────────────────
    role: {
      type: String,
      enum: {
        values: ['user', 'admin'],
        message: 'Role must be either "user" or "admin"',
      },
      default: 'user',
    },

/* ── Password Reset ────────────────────────────────────────────────────────
  resetPasswordToken  → WHO has the reset permission?
  resetPasswordExpire → WHEN does that permission expire?
    - These two fields are used for Forgot Password.

  Why hash the token?
    If the database is ever compromised, attackers would only see the hash,
    not the actual reset token. They cannot reverse a SHA-256 hash to get
    the original token, so they cannot reset anyone's password.

  select: false ensures these fields are NEVER returned in normal queries.
  They are only fetched explicitly when needed (e.g., during password reset). */ 
    resetPasswordToken: {
      type: String,
      select: false,
    },

/* This stores when the reset token expires.
      For example: Token generated: 10:00 AM
          Expires: 10:30 AM
      Database: resetPasswordExpire: 10:30 AM */ 
    resetPasswordExpire: {
      type: Date,
      select: false,
    },

    // ── Profile (Optional - for future expansion) ─────────────────────────────
    // profilePicture: { type: String, default: '' },
    // collegeName: { type: String },
    // mobileNumber: { type: String, select: false }, // hidden by default for privacy
  },
  {
    // Automatically adds `createdAt` and `updatedAt` timestamp fields
    timestamps: true,
  }
);

module.exports = mongoose.model('User', UserSchema);
