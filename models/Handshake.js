/**
 * @file models/Handshake.js
 * @description The Privacy-First Contact Request system.
 *
 * Core Concept:
 * When a buyer is interested in an item, they initiate a "Handshake".
 * The seller reviews the request and can approve or decline it.
 *
 * Privacy Flow:
 * 1. Buyer submits Handshake (status: 'pending')
 * 2. Seller approves (status: 'approved')
 * 3. ONLY THEN are the private details (hostelName, roomNumber, mobileNumber)
 *    selectively shared based on the `sharedDetails` flags.
 * 4. This ensures sellers always control their personal information.
 *
 * This model is the cornerstone of the platform's trust & safety architecture.
 */

const mongoose = require('mongoose');

const HandshakeSchema = new mongoose.Schema(
  {
    // ── Participants ──────────────────────────────────────────────────────────
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'A Handshake must have a buyer'],
    },

    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'A Handshake must have a seller'],
    },

    // ── Associated Item ───────────────────────────────────────────────────────
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: [true, 'A Handshake must be linked to a specific item'],
    },

    // ── Status ────────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'declined'],
        message: 'Handshake status must be "pending", "approved", or "declined"',
      },
      default: 'pending',
    },

    // ── Granular Privacy Controls ─────────────────────────────────────────────
    // The seller explicitly chooses WHICH private details to share upon approval.
    // This gives sellers fine-grained control over their privacy.
    // Both default to false — nothing is shared unless the seller actively enables it.
    sharedDetails: {
      // Whether the seller agrees to share their Hostel/Room location
      shareHostel: {
        type: Boolean,
        default: false,
      },
      // Whether the seller agrees to share their mobile number
      shareMobile: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    // Automatically adds `createdAt` and `updatedAt` timestamp fields
    timestamps: true,
  }
);

// ── Compound Unique Index ─────────────────────────────────────────────────────
// Prevents a buyer from sending duplicate Handshake requests
// to the same seller for the same item.
HandshakeSchema.index({ buyerId: 1, itemId: 1 }, { unique: true });

module.exports = mongoose.model('Handshake', HandshakeSchema);
