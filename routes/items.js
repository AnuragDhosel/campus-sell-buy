/**  intro of this file
 @file routes/items.js  -> This file contains all the routes related to items.
 @description Item listing routes. -> This file contains routes such as: POST /api/items, GET /api/items, GET /api/items/:id, PUT /api/items/:id, DELETE /api/items/:id
                                        Currently, you've implemented the POST route.
 
 * Base path (registered in server.js):  /api/items

 * Middleware Chain for POST /:
 
    Request               ──► A user clicks: List Item, React sends : POST /api/items , The request reaches Express , First Middleware : protect run
       │
       ▼
    protect                ──► This middleware checks, Is this user logged in? , It verifies the JWT. If valid, it adds : req.user
       │
       ▼
    upload.array('images', 3)   ──► Multer runs. Its jobs are : Read multipart/form-data , Read uploaded files , Store files in memory. Create  req.files and req.body
        |                         Suppose React : sends, Title, Laptop, Price, 25000, Images and 3 photos
        |                        After Multer : req.body = { title:"Laptop", price:"25000" } and
        |                                      req.files = [ file1, file2, file3 ]
        ▼
    createItem            ──► Now everything is ready. So controller can :
                                Upload images(to Cloudinary) , Save item(to MongoDB) , Return response
 
 * The order of middleware matters:
     1. `protect` runs FIRST because we want to reject unauthenticated users
        BEFORE spending resources parsing and holding files in memory.
     2. `upload` runs SECOND to parse the multipart body.
     3. `createItem` runs LAST once we have both a verified user and the files.
  
 * Multer Error Handling:
     Multer throws its own error class `MulterError` for things like:
        - LIMIT_FILE_SIZE      : File Too Large ──► A file exceeded the 5MB limit
        - LIMIT_FILE_COUNT     : Too Many Images ──► More than 3 files were sent
        - LIMIT_UNEXPECTED_FILE: Wrong Field Name ──► A field name other than 'images' was used
        We catch these in a custom wrapper and return clean JSON errors.
 
 * Available Routes:
      POST   /api/items     → Create a new listing (Private)
 */

const express = require('express');  // Import Express to create a router
const { protect } = require('../middleware/authMiddleware'); // Import the protect middleware to secure routes
const upload = require('../middleware/upload'); // Import the Multer upload middleware for handling file uploads
const { createItem } = require('../controllers/itemController'); // Import the createItem controller function to handle item creation logic
 

const router = express.Router();

/* ── Multer Error Handler Wrapper ──────────────────────────────────────────────
Multer reports upload errors through a callback instead of throwing them like normal route errors. 
 Therefore, we wrap upload.array() inside our own middleware (handleUpload) so we can intercept those 
 errors and return consistent, user-friendly JSON responses.
      If Multer finds an error:
                         - File too large
                         - Too many files
                         - Wrong field name
        it doesn't throw the error.
        Instead of this, it passes it on:
                           (err) => { .... }
 that's why 
     Instead of `upload.array(...)` directly, wrap it with this function.
*/
const handleUpload = (req, res, next) => {
  // `upload.array('images', 3)` returns a middleware function.
  // We call it manually here so we can intercept its errors.
  upload.array('images', 3)(req, res, (err) => {
    if (err) {
      // Multer's own errors (file size, file count, unexpected field)
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Each image must be under 5MB.',
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Too many files. You can upload a maximum of 3 images.',
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: "Unexpected field. Use the field name 'images' for file uploads.",
        });
      }
      // Our custom fileFilter error (wrong file type — set in upload.js)
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    // if No error — pass control to the next middleware (createItem controller)
    next();
  });
};

// ── POST /api/items ───────────────────────────────────────────────────────────
// Create a new marketplace listing.
// Protected: requires a valid JWT in the Authorization header.
// Body: multipart/form-data with text fields + up to 3 image files.
router.post('/', protect, handleUpload, createItem);

module.exports = router;
