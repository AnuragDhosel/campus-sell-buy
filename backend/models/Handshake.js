/**
 * @file models/Handshake.js
 * @description This file defines the Handshake Model. 
 *              The Privacy-First Contact Request system.
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

    /* Why ObjectId and why ref : "User" ?
      Because buyer is another document.
      Instead of storing
        Name , Email , Phone
        we store - User ID

      ref : "User" 
        The ref property tells Mongoose: "This ObjectId belongs to the User collection."
        It creates a relationship between two collections.  
        This ObjectId points to a document inside the User collection.
    */

    // ── Status ────────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'declined'], // only these values are allow
        message: 'Handshake status must be "pending", "approved", or "declined"',
      },
      default: 'pending',
    },

/* ── Granular Privacy Controls ─────────────────────────────────────────────
  * This is the best part of your project.
      - Instead of
          Approve ⟶ Share Everything
      - You allow
          Approve ⟶ Choose What to Share
        Example
          - Seller chooses : shareHostel = true and shareMobile = false
          - Buyer receives : Hostel ✔ , Room ✔ , Phone ❌
          - Both default : false
              Means - Nothing is shared automatically. Seller must explicitly allow it.
      - Very privacy-friendly.

  * timestamps
      timestamps:true
        Automatically creates : createdAt and updatedAt
        No need to manually store dates. */
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

/* ── Production Indexes (IMP) ────────────────────────────────────────────────────────
check : if buyer has already requested contact for the same item, it prevents duplicate requests. 
        by checking seller's pending requests, it allows sellers to quickly view all buyers interested in their items. 

Index 1: Seller Notification Feed
Used by: getMyNotifications → { sellerId: req.user.id, status: 'pending' }

Query: Handshake.find({ sellerId: req.user.id, status: 'pending' });

Why this index?
 Every time a seller opens the notifications page, MongoDB must find all pending handshake requests 
 for that seller.

Without this index:
  MongoDB checks every handshake document in the collection.(Example: 50,000 documents)

With this compound index:
  MongoDB directly jumps to:
      sellerId -> pending requests
  and reads only the matching documents.
  how it work -> see the mongodb_indexing.txt file in the root of this project.

This significantly improves the performance of the notifications page. */
HandshakeSchema.index({ sellerId: 1, status: 1 });

/* Index 2: Duplicate Request Lookup
Used by: requestContact → checks if a handshake already exists for this buyer + item

Query: Handshake.findOne({ buyerId: req.user.id, itemId: itemId });

Why this index?
 Before creating a new handshake, we first check whether this buyer has already requested 
 contact for the same item.

Without this index:
  MongoDB scans every handshake document.

With this compound index:
  MongoDB directly searches using: buyerId + itemId

This makes duplicate-request checking almost instantaneous. */
HandshakeSchema.index({ buyerId: 1, itemId: 1 });

module.exports = mongoose.model('Handshake', HandshakeSchema);
