/**
 * @file routes/handshakes.js
 * @description Handshake (contact request) routes. - This file contains all the routes related to the Handshake system.
 *
 * Base URL (registered in server.js):n/api/handshakes
 *
 * Purpose:
 *    A buyer can't directly view the seller's private contact details.
 *    Instead, the buyer sends a contact request (handshake) to the seller.
 *    and The seller can then approve or decline that request.
 *    according to that request seller decides whether to share their phone number or hostel room number with the buyer. 
 * 
 *
 * ALL routes in this file are PROTECTED — every handshake action requires a valid JWT. 
 * We apply `protect` to the entire router using router.use() instead of adding it to each individual route. 
 * This is cleaner and ensures
 * no route is accidentally left unprotected.
 *
 * Available Routes:
 *   POST   /api/handshakes/request            → Buyer sends a contact request
 *   GET    /api/handshakes/my-notifications   → Seller views pending requests
 *   PUT    /api/handshakes/:id/respond        → Seller approves or declines
 *
 * Request Flow:
 *
 *   Buyer                                      Seller
 *   ─────                                      ──────
 *   POST /request ──────────────────────────► GET /my-notifications
 *   (creates handshake)                       (sees pending requests)
 *                                                    │
 *                                                    ▼
 *                                             PUT /:id/respond
 *                                             (approve or decline)
 */

const express = require('express');
const { protect } = require('../middleware/authMiddleware'); // import JWT authentication middleware.
const {
  requestContact,
  getMyNotifications,
  respondToHandshake,
  getHandshakeById,
  getMyRequests,
  getItemRequests,
} = require('../controllers/handshakeController');

const router = express.Router(); // Create a new Express router.

router.use(protect);

/* ── Buyer sends a contact request for an item. ─────────────────────────────────────────────
Endpoint: POST /api/handshakes/request
Request Body: 
       { "itemId": "...", "sellerId": "..." }
Protected: ✅ (buyer must be logged in) */
router.post('/request', requestContact);

/* ── Seller views all pending contact requests. ─────────────────────────────────────
Endpoint: GET /api/handshakes/my-notifications
Returns : 
   - an array of handshakes with populated buyer & item details.
   - List of buyers requesting contact information.
Protected: ✅ (seller must be logged in) */
router.get('/my-notifications', getMyNotifications);

/* ── Buyer views sent contact requests. ─────────────────────────────────────────────
Endpoint: GET /api/handshakes/my-requests
Returns : 
   - an array of handshakes sent by the logged-in buyer.
Protected: ✅ (buyer must be logged in) */
router.get('/my-requests', getMyRequests);

/* ── Seller views all buyer requests for a specific item. ────────────────────────────
Endpoint: GET /api/handshakes/item/:itemId/requests
Returns :
   - all handshakes (pending + approved + declined) for that item.
   - Enforces seller ownership: only the item's seller can access this.
Protected: ✅ (seller must be logged in) */
router.get('/item/:itemId/requests', getItemRequests);

/* ── Retrieve single handshake by ID with permission-controlled contact info. ─────
Endpoint: GET /api/handshakes/:id
Protected: ✅ (buyer or seller involved must be logged in) */
router.get('/:id', getHandshakeById);

/* ── Seller responds to a contact request. ──────────────────────────────────────────
Endpoint: PUT /api/handshakes/:id/respond
Request Body: 
     { "status": "approved" | "declined", "shareRoomNumber": true, "sharePhoneNumber": false }
Protected: ✅ + Authorization check inside the controller (only the seller can respond) */
router.put('/:id/respond', respondToHandshake);

module.exports = router;

