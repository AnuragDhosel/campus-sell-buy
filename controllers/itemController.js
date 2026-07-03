/**
 * @file controllers/itemController.js
 * @description Business logic for Item (marketplace listing) operations.
 *
 * ─── Cloudinary Upload Flow (Detailed) ───────────────────────────────────────
 *
 * The challenge: Cloudinary's Node SDK does NOT have a simple
 * `cloudinary.upload(buffer)` function. Its primary upload method,
 * `upload_stream`, works with Node.js Streams — not raw Buffers.
 *
 * The solution: We use the `streamifier` package to convert a Buffer
 * into a Readable Stream, then pipe it into Cloudinary's upload stream.
 *
 *  Buffer (req.files[i].buffer)
 *      │
 *      ▼
 *  streamifier.createReadStream(buffer)   ← Wraps Buffer as a Readable Stream
 *      │
 *      │  .pipe()                          ← Connects Readable → Writable
 *      │
 *      ▼
 *  cloudinary.uploader.upload_stream(...)  ← Writable Stream → Cloudinary servers
 *      │
 *      ▼
 *  callback({ secure_url, public_id, ... }) ← Cloudinary's response after storing
 *
 * We wrap this in a Promise so we can use async/await cleanly.
 * All uploads run in parallel using Promise.all() for maximum speed.
 */

const cloudinary    = require('../config/cloudinary');
const streamifier   = require('streamifier');
const Item          = require('../models/Item');

// ─── Helper: Upload a Single Buffer to Cloudinary ────────────────────────────

/**
 * Wraps Cloudinary's stream-based upload in a Promise.
 * This lets us use `await` instead of nested callbacks.
 *
 * @param {Buffer} fileBuffer - Raw binary data of the image (from Multer memoryStorage).
 * @param {string} folder     - The Cloudinary folder to store images in.
 * @returns {Promise<object>} - Resolves with Cloudinary's result object ({ secure_url, public_id, ... }).
 */
const uploadToCloudinary = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    // ── Step 1: Create a Cloudinary upload stream ──────────────────────────
    // `upload_stream` is a writable stream. Cloudinary reads bytes from it
    // and stores them. When done, it calls our callback.
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,        // Organizes images in a named folder in your Cloudinary account
        resource_type: 'image', // Tells Cloudinary to treat this as an image (not video/raw)
      },
      (error, result) => {
        // This callback fires when Cloudinary finishes (success or failure).
        if (error) {
          // Cloudinary returned an error — reject the Promise.
          reject(error);
        } else {
          // Cloudinary succeeded — resolve with the result object.
          // result.secure_url is the permanent HTTPS URL of the stored image.
          resolve(result);
        }
      }
    );

    // ── Step 2: Convert Buffer → Readable Stream ───────────────────────────
    // Multer's memoryStorage gives us `fileBuffer` (a raw Node.js Buffer).
    // Cloudinary's upload_stream needs a Readable Stream as its source.
    // `streamifier.createReadStream()` wraps the Buffer in a Readable Stream.
    const readableStream = streamifier.createReadStream(fileBuffer);

    // ── Step 3: Pipe the data ──────────────────────────────────────────────
    // `.pipe()` connects the Readable (our image bytes) to the Writable
    // (Cloudinary's upload endpoint). Node.js automatically pumps chunks
    // of data from source → destination until the buffer is exhausted.
    readableStream.pipe(uploadStream);
  });
};

// ─── Controller: Create Item ─────────────────────────────────────────────────

/**
 * @controller createItem
 * @route   POST /api/items
 * @access  Private (JWT required — set by protect middleware)
 * @desc    Uploads images to Cloudinary and saves a new Item to MongoDB.
 */
const createItem = async (req, res) => {
  try {
    // ── Step 1: Verify at least 1 image was uploaded ───────────────────────
    // `req.files` is populated by Multer's upload.array() middleware.
    // It will be an empty array [] if no files were sent.
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload at least one image for your listing.',
      });
    }

    // ── Step 2: Extract text fields from request body ──────────────────────
    // These come from the non-file parts of the multipart/form-data request.
    // Multer parses them and puts them in req.body, just like express.json() would.
    const {
      title,
      description,
      price,
      category,
      collegeName,
      hostelName,
      roomNumber,
    } = req.body;

    // ── Step 3: Upload ALL images to Cloudinary in parallel ────────────────
    // `req.files` is an array of file objects, each with a `.buffer` property.
    // We map each file to a Promise (our uploadToCloudinary helper),
    // then `Promise.all` runs them all concurrently for maximum speed.
    //
    // Example: 3 images → 3 Promises → all 3 run simultaneously.
    // Total time ≈ the time of the slowest single upload (not 3× a single upload).
    const uploadPromises = req.files.map((file) =>
      uploadToCloudinary(file.buffer, 'campus_marketplace/items')
    );

    // Wait for every upload to complete (or fail).
    // `cloudinaryResults` is an array of Cloudinary result objects.
    const cloudinaryResults = await Promise.all(uploadPromises);

    // ── Step 4: Extract secure URLs from Cloudinary results ───────────────
    // Each result object has many fields. We only need `secure_url` —
    // the permanent HTTPS link we'll store in MongoDB and serve to the frontend.
    //
    // Example secure_url:
    // "https://res.cloudinary.com/your_cloud/image/upload/v1234/campus_marketplace/items/abc123.jpg"
    const imageUrls = cloudinaryResults.map((result) => result.secure_url);

    // ── Step 5: Create the Item document in MongoDB ────────────────────────
    // We use `Item.create()` which is shorthand for `new Item({...}).save()`.
    //
    // IMPORTANT: `seller` is set from `req.user.id` — NOT from req.body.
    // `req.user` was attached by the `protect` middleware after JWT verification.
    // This means a user can NEVER fake their seller identity — it always comes
    // from the verified JWT, making it tamper-proof.
    const newItem = await Item.create({
      title,
      description,
      price:       Number(price),   // req.body values are strings — convert price to Number
      category,
      collegeName,
      hostelName,
      roomNumber,
      images:      imageUrls,       // Array of Cloudinary HTTPS URLs
      seller:      req.user.id,     // From JWT via protect middleware (tamper-proof)
    });

    // ── Step 6: Return the newly created item ──────────────────────────────
    res.status(201).json({
      success: true,
      message: 'Item listed successfully!',
      data: newItem,
    });

  } catch (error) {
    // Catch Mongoose validation errors (missing required fields, etc.)
    // and Cloudinary errors (auth failure, network issues, etc.)
    console.error(`Create Item Error: ${error.message}`);

    // Handle Mongoose validation errors specifically for a cleaner response
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating the listing. Please try again.',
    });
  }
};

module.exports = { createItem };
