/**
 * @file middleware/upload.js
 * @description Multer middleware for intercepting multipart/form-data file uploads.
 *
 * ─── Why "memoryStorage" and NOT "diskStorage"? ───────────────────────────────
 *
 * There are two ways Multer can hold a file while processing your request:
 *
 * Option A: diskStorage → saves the file to the server's hard disk first,
 *   then you read it back and upload it to Cloudinary, then delete the temp file.
 *   Downsides: 3 I/O operations, temp files to manage, slower.
 *
 * Option B: memoryStorage → holds the file as a raw Buffer in RAM.
 *   You get `req.files`, each with a `.buffer` property containing the file's bytes.
 *   You then pipe that buffer DIRECTLY to Cloudinary's upload stream.
 *   Downsides: Large files can exhaust RAM (fine for our 3-image limit with a size cap).
 *
 * We use memoryStorage because it is faster, has no disk cleanup burden,
 * and is the standard pattern for Buffer → Cloud stream pipelines.
 *
 * ─── The Upload Flow (Buffer → Stream → Cloudinary) ──────────────────────────
 *
 *   Browser           Express / Multer         Our Controller          Cloudinary
 *   ──────            ────────────────         ──────────────          ──────────
 *   POST form-data ──→ memoryStorage ──→ req.files[n].buffer ──→ upload_stream ──→ stored
 *
 *   Step 1: Multer intercepts the multipart request, reads each file part,
 *           and stores the raw bytes in `req.files[n].buffer` (a Node.js Buffer).
 *
 *   Step 2: In the controller, for each buffer we call:
 *             cloudinary.uploader.upload_stream(options, callback)
 *           This returns a writable stream that points to Cloudinary's servers.
 *
 *   Step 3: We use `streamifier.createReadStream(buffer)` to wrap the raw
 *           Buffer into a Node.js Readable stream.
 *
 *   Step 4: We `.pipe()` the Readable (our image bytes) into the Writable
 *           (Cloudinary's upload endpoint). Cloudinary receives the bytes,
 *           stores the image, and calls back with the result (including secure_url).
 */

const multer = require('multer');

// ── Storage Strategy: Memory ──────────────────────────────────────────────────
// memoryStorage tells Multer NOT to save files to disk.
// Instead, each file is stored as a raw binary Buffer at req.files[n].buffer.
// This buffer is what we stream directly to Cloudinary in the controller.
const storage = multer.memoryStorage();

// ── File Filter: Reject Non-Images ────────────────────────────────────────────
// This function is called by Multer for EVERY file in the upload request.
// It acts as a gatekeeper — only letting valid image types through.
const imageFileFilter = (req, file, callback) => {
  // `file.mimetype` is set by the browser (e.g. "image/jpeg", "image/png").
  // We whitelist only the formats we accept.
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    // null as first arg means "no error"
    // true as second arg means "accept this file"
    callback(null, true);
  } else {
    // Passing an Error object causes Multer to reject the file and
    // forward the error to Express's global error handler.
    callback(
      new Error('Invalid file type. Only JPEG, JPG, and PNG images are allowed.'),
      false // false = reject this file
    );
  }
};

// ── Multer Instance ───────────────────────────────────────────────────────────
// We create the configured Multer instance here once and export it.
const upload = multer({
  storage: storage,         // Use RAM buffer, not disk
  fileFilter: imageFileFilter, // Reject non-image files at the middleware layer

  limits: {
    // Cap each individual file at 5MB.
    // This prevents memory exhaustion from huge uploads.
    // 5 * 1024 * 1024 = 5,242,880 bytes = 5 MB
    fileSize: 5 * 1024 * 1024,

    // Absolutely cap the number of files at 3.
    // This is the hard enforcement — even if the client tries to send 10 files,
    // Multer will reject the request with a MulterError('LIMIT_FILE_COUNT').
    files: 3,
  },
});

// ── Export the upload middleware ──────────────────────────────────────────────
// We export the configured `upload` multer instance.
// In the route file, we will call: upload.array('images', 3)
// - 'images'  → the form-data field name the frontend must use for files
// - 3         → maximum number of files accepted (second line of defense)
module.exports = upload;
