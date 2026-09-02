/**
 * @file routes/items.js
 * @description Item listing routes.
 * Base path (registered in server.js): /api/items
 *
 * Available Routes:
 *   POST   /api/items            -> Create a new listing (Private)
 *   GET    /api/items            -> Browse/search items with filters (Public)
 *   GET    /api/items/colleges   -> Get distinct college names with counts (Public)
 *   GET    /api/items/:id        -> Fetch item by ID (Public)
 *   PUT    /api/items/:id        -> Update listing (Private - Owner only)
 *   DELETE /api/items/:id        -> Delete listing (Private - Owner only)
 *   PUT    /api/items/:id/report -> Report an item (Private)
 */

const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const {
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem,
  reportItem,
  getColleges,
  renewItem,
} = require('../controllers/itemController');

const router = express.Router();

const handleUpload = (req, res, next) => {
  upload.array('images', 3)(req, res, (err) => {
    if (err) {
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
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    next();
  });
};

/* -- POST /api/items */
router.post('/', protect, handleUpload, createItem);

/* -- GET /api/items */
router.get('/', getItems);

/* -- GET /api/items/colleges
     IMPORTANT: registered BEFORE /:id so Express does not treat "colleges" as an ObjectId param */
router.get('/colleges', getColleges);

/* -- GET /api/items/:id */
router.get('/:id', getItemById);

/* -- PUT /api/items/:id/renew
     IMPORTANT: registered BEFORE PUT /:id to prevent Express treating "renew" as a generic :id value.
     Seller ownership and action_required state are verified inside the renewItem controller. */
router.put('/:id/renew', protect, renewItem);

/* -- PUT /api/items/:id */
router.put('/:id', protect, updateItem);

/* -- DELETE /api/items/:id */
router.delete('/:id', protect, deleteItem);

/* -- PUT /api/items/:id/report */
router.put('/:id/report', protect, reportItem);

module.exports = router;
