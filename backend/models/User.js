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
      // Basic email format validation using a regex
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
