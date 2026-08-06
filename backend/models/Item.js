/**
 * @file models/Item.js
 * @description Mongoose schema for a marketplace listing (Item).
 *
 * Privacy Architecture:
 * - `hostelName` and `roomNumber` are PRIVATE fields. They are NEVER returned in public listing APIs. 
 *    They are only revealed to a buyer AFTER a Handshake request has been approved by the seller.
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

/*  ── Media ─────────────────────────────────────────────────────────────────
    Stores Cloudinary image information.
    
    WHY objects instead of strings or only URL?
      Old:  images: ["https://res.cloudinary.com/.../abc123.jpg"]
      New:  images: [{ url: "https://...", publicId: "campus_marketplace/items/abc123" }]
    
* What is secure_url?
    - secure_url is the permanent HTTPS URL of the uploaded image.
        Example: https://res.cloudinary.com/afx3absu/image/upload/v1234/campus_marketplace/items/abc123.jpg
    - React uses this URL inside: <img src={image.url} />
         The browser downloads the image directly from Cloudinary.   

* What is public_id?
    - publicId is Cloudinary's unique identifier for the uploaded image.
        Example: campus_marketplace/items/abcd1234
    - Notice : There is no domain , no version , no .jpg
    - Cloudinary uses this ID to identify the image internally.    

* Think of a library : 
    - Every book has Book Name and Book Number in library
    - suppose : Book Name -> Harry Potter and Book Number -> A-304-12  
            Visitors search using the book name, The librarian finds the book using the book number.  
              Similarly:  
            Browser displays image using the URL, Cloudinary manages the image using publicId.

  * Why is public_id important?
      - Suppose a user deletes an item.
          Your backend does : DELETE /api/items/123
          Should MongoDB delete only?
            No , You also want Cloudinary to delete the image.
            Otherwise
                MongoDB Deleted, but Cloudinary Still has image
          This is called
                "Orphaned Images" : Images with no item.
          They waste storage.                    
  
  * How does Cloudinary delete? 
        Cloudinary's delete API is : cloudinary.uploader.destroy(...) : here we pass public_id not URL
        Cloudinary immediately removes image from cloudinary
  
  * What if you only store URL?
        Suppose MongoDB stores ->  images:["https://res.cloudinary.com/afx3absu/image/upload/v1784295887/campus_marketplace/items/abcd1234.jpg"]
          Now user deletes item.
            You have only URL -> https://....
            Cloudinary cannot delete using URL, It wants public_id
            Now you have two options.
              Option 1 - Write complicated code.   
              Option 2 - Simply store - publicId   

  * Storing `publicId` alongside `url` makes future features trivial:
      - Delete Listing  → loop images, call cloudinary.destroy(publicId)
      - Replace Image   → destroy old publicId, upload new, save new publicId
      - Admin Delete     → same destroy call, guaranteed cleanup
      - Orphan Prevention → no Cloudinary assets left behind after deletion
    
    Max 3 images enforced at BOTH the schema level (validator below)
AND the middleware level (Multer limits in middleware/upload.js). */
    images: { 
      type: [
        {
          url: {
            type: String,
            required: [true, 'Image URL is required'],
          },
          publicId: {
            type: String,
            required: [true, 'Cloudinary public_id is required'],
          },
        },
      ],
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

/* ── Search API Compound Index ─────────────────────────────────────────────────
Our getItems controller builds filters using: { status, category, collegeName }

WHY this specific index?
  Without an index, MongoDB performs a COLLECTION SCAN — it reads EVERY
  document in the items collection and checks if it matches the filter.
  With 10,000 listings, that's 10,000 document reads per search request.

  A compound index lets MongoDB jump directly to matching documents.
  It works like a phone book sorted by: status → category → collegeName.

  The field ORDER matters (the "ESR" rule — Equality, Sort, Range):
    1. status       → Always present in every query (equality match)
    2. category     → Frequently filtered (equality match)
    3. collegeName  → Frequently filtered (equality match)

  MongoDB uses the index LEFT-TO-RIGHT. So this single index efficiently
  serves ALL of these query combinations:
    { status }                                → uses index ✅
    { status, category }                      → uses index ✅
    { status, category, collegeName }          → uses index ✅ (full coverage)
    { status, collegeName } (skip category)   → partial, but still better than no index

  This replaces the need for separate single-field indexes on category and collegeName. */
ItemSchema.index({ status: 1, category: 1, collegeName: 1 });

module.exports = mongoose.model('Item', ItemSchema);
