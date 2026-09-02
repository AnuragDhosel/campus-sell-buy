/**
 * @file models/Notification.js
 * @description Persistent notification model for events that cannot be synthesised
 *              from live DB state — e.g. a seller deleted their item, or the cron
 *              auto-archived an item after 7 days with no seller response.
 *
 *  Types stored here:
 *    'deleted'  — seller manually deleted a listing (from the expiry card or My Listings)
 *    'archived' — cron auto-archived after 7-day no-response window
 *    'renewed'  — seller renewed an expiry-flagged listing (history record)
 *
 *  All other notification types (handshake contact requests, report/block, expiry action_required)
 *  are still synthesised on-the-fly in getMyNotifications — this model is ONLY for event types
 *  that have no surviving DB state to query once the triggering action completes.
 *
 *  The badge / read-unread tracking uses the existing localStorage key
 *  cm_read_notif_ids_<userId> — real MongoDB _id strings work directly with that system.
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // The user (seller) who receives this notification
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Notification type — drives the card UI in NotificationCard.jsx
    type: {
      type: String,
      enum: ['deleted', 'archived', 'renewed'],
      required: true,
    },

    // Human-readable notification message using the actual item name
    message: {
      type: String,
      required: true,
    },

    // Snapshot of the item title at the time of the event.
    // Stored here because the Item document may no longer exist (e.g. deleted).
    itemTitle: {
      type: String,
      default: '',
    },

    // Optional reference to the item (may be null/gone for deleted items)
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      default: null,
    },
  },
  {
    // Adds createdAt and updatedAt automatically.
    // createdAt is used for newest-to-oldest ordering.
    timestamps: true,
  }
);

module.exports = mongoose.model('Notification', notificationSchema);
