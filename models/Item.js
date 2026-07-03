/**
 * @file models/Item.js
 * @description Mongoose schema for a marketplace listing (Item).
 *
 * Privacy Architecture:
 * - `hostelName` and `roomNumber` are PRIVATE fields. They are NEVER
 *   returned in public listing APIs. They are only revealed to a buyer
 *   AFTER a Handshake request has been approved by the seller.
 *
 * Reporting System:
 * - `reports` stores an array of User ObjectIds who have reported the item.
 *   Using a Set-like approach (checking before pushing) prevents duplicate reports.
 *   The `status` field allows admins to take action on reported items.
 */

const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema(
  {
    // ── Core Listing Details ──────────────────────────────────────────────────
    title: {
      type: String,
      required: [true, 'Please provide a title for the item'],
      trim: true,   // Removes extra whitespaces at the beginning or end.
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },

    description: {
      type: String,
      required: [true, 'Please provide a description'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },

    price: {
      type: Number,
      required: [true, 'Please provide a price'],
      min: [0, 'Price cannot be negative'],
    },

    category: {
      type: String,
      required: [true, 'Please specify a category'],
      trim: true,
      // Example categories. Can be expanded or moved to its own model.
      // enum: ['Books', 'Electronics', 'Clothing', 'Furniture', 'Sports', 'Other'],
    },

    // ── Media ─────────────────────────────────────────────────────────────────
    // Stores Cloudinary/S3 URLs (or local paths) for item images.
    // Max 3 images enforced at the controller level using Multer (to be added in Day 3).
    images: {
      type: [String], // Array of Strings
      default: [],
      validate: {
        validator: function (val) {
          return val.length <= 3;
        },
        message: 'An item cannot have more than 3 images',
      },
    },

    // ── Location Details ──────────────────────────────────────────────────────
    collegeName: {
      type: String,
      required: [true, 'Please specify the college name for this listing'],
      trim: true,
    },

    // PRIVATE: Only revealed after a Handshake is approved.
    hostelName: {
      type: String,
      required: [true, 'Please provide the hostel name for pickup coordination'],
      trim: true,
      select: false, // Hidden from all public queries by default
    },

    // PRIVATE: Only revealed after a Handshake is approved.
    roomNumber: {
      type: String,
      required: [true, 'Please provide the room number for pickup coordination'],
      trim: true,
      select: false, // Hidden from all public queries by default
    },

    // ── Relationships ─────────────────────────────────────────────────────────
    // The user who created this listing.
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'An item must belong to a seller'],
    },

    // ── Moderation ────────────────────────────────────────────────────────────
    // Array of User IDs who have reported this item.
    // The uniqueness of reporters is enforced at the controller level
    // using $addToSet operator in MongoDB, which prevents duplicates.
    reports: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // Tracks the lifecycle and visibility of a listing.
    status: {
      type: String,
      enum: {
        values: ['available', 'hidden', 'action_required', 'sold', 'archived'],
        message: 'Invalid status value',
      },
      default: 'available',
    },
  },
  {
    // Automatically adds `createdAt` and `updatedAt` timestamp fields
    timestamps: true,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Adding compound indexes improves query performance for common operations.
// e.g., fetching all available listings from a specific college.
ItemSchema.index({ collegeName: 1, status: 1 });
ItemSchema.index({ seller: 1 });

module.exports = mongoose.model('Item', ItemSchema);
