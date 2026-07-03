/**
 * @file config/cloudinary.js
 * @description Initializes and configures the Cloudinary Node.js SDK.
 *
 * What is Cloudinary?
 *   Cloudinary is a cloud-based media management service. We use it to:
  *   - Store images permanently (so they survive server restarts).
  *   - Get back a permanent, publicly-accessible HTTPS URL for each image.
  *   - (Future) Auto-resize, compress, and optimize images on the fly.
 *
 * How this file is used:
 *   The configured `cloudinary` object exported here is imported into
 *   middleware/upload.js, where it is used to open an upload stream
 *   and push the image buffer up to our Cloudinary cloud.
 */

const cloudinary = require('cloudinary').v2;

// ── Configure the SDK ─────────────────────────────────────────────────────────
// cloudinary.config() sets global credentials used by every upload call.
// All three values are loaded from .env — they are NEVER hardcoded here.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // Your unique cloud identifier
  api_key:    process.env.CLOUDINARY_API_KEY,    // Public key (safe to log, not secret)
  api_secret: process.env.CLOUDINARY_API_SECRET, // Secret key — NEVER expose this
});

module.exports = cloudinary;
