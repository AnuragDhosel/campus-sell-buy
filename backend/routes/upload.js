/**
 * @file routes/upload.js
 * @description Cloudinary signed upload route.
 * 
 * Instead of streaming files through Vercel serverless (which has body size limits),
 * the frontend uploads images DIRECTLY to Cloudinary using a signed upload.
 * 
 * Flow:
 *   1. Frontend requests a signature from POST /api/upload/sign (this file)
 *   2. Backend generates a HMAC-SHA1 signature using the Cloudinary secret
 *   3. Frontend sends the file + signature directly to Cloudinary's API
 *   4. Cloudinary returns the secure_url
 *   5. Frontend sends only the URLs to POST /api/items (no binary data)
 */

const express   = require('express');
const cloudinary = require('../config/cloudinary');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * POST /api/upload/sign
 * Returns a signed upload signature for Cloudinary direct upload.
 * Requires authentication so random users can't use your Cloudinary account.
 */
router.post('/sign', protect, (req, res) => {
  try {
    const timestamp = Math.round(Date.now() / 1000);
    const folder    = 'campus_marketplace/items';

    const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || 'afx3absu').trim();
    const apiKey    = (process.env.CLOUDINARY_API_KEY || '335959276761554').trim();
    const envSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();
    const apiSecret = (envSecret && !envSecret.startsWith('bHn'))
      ? envSecret
      : 'RsunoX9eEX983Y-Qs71KVtJUKxQ';

    // Generate the signature using Cloudinary's SDK helper
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder,
      },
      apiSecret
    );

    res.json({
      success:    true,
      signature,
      timestamp,
      folder,
      cloud_name: cloudName,
      api_key:    apiKey,
    });
  } catch (error) {
    console.error('Upload sign error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to generate upload signature.' });
  }
});

module.exports = router;
