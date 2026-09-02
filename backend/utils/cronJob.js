/* defination of cron jobs
*  @file utils/cronJob.js   : This file contains all the background tasks that should run automatically.
*  @description    :   This file contains the cron jobs (scheduled background tasks).

=========================
CRON JOB NOTES
=========================

* Definition:
    - A Cron Job is a background task that runs automatically at a scheduled time or interval without any user 
      request.

* Why We Use It: 
    - Some tasks should run automatically even when no user is using the application.
    - Examples:
          * Archive expired listings
          * Send reminder emails
          * Backup database
          * Delete old logs
          * Generate reports

* Backend vs Cron Job:
    - Normal API: Works only when user asks.
            User Request -> Backend Executes -> Response
    
    - Cron Job: Works automatically.
            Scheduled Time -> Backend Executes -> Task Completed

* How It Works:
    Server Starts -> connectDB() -> startCronJobs() -> Cron Scheduler Waits -> Scheduled Time Arrives -> Task Executes -> Waits Again

* Important:
    - Cron Job does NOT run continuously.
    - It waits for the scheduled time, and then executes the task, and then waits again.
    - Always call connectDB() before startCronJobs() so database operations work correctly.

* Project Example:
    Item Posted ──► 30 Days Pass ──► Mark Action Required ──► Seller Notified ──► Wait 7 Days ──► Archive Item

* Interview Answer:
    "A Cron Job is a background task that runs automatically at a scheduled time without any user request. 
     It is used to automate repetitive tasks such as backups, sending emails, deleting old data, or updating 
     records. 
     In my Campus Marketplace project, a Cron Job runs every midnight to check listings older than 30 days, 
     marks them as Action Required, and later archives them if the seller does not respond."

* Cron Expression Cheat Sheet:
    '0 0 * * *'    -> Every day at midnight (00:00)        <- Production
    '* * * * *'    -> Every minute (for testing only!)     <- Testing

* MongoDB Operators Used:
    $lte (Less Than or Equal): { createdAt: { $lte: thirtyDaysAgo } }
    updateMany(): Updates ALL matching documents in a single database operation.
*/

const cron = require('node-cron');
const Item = require('../models/Item');
const Notification = require('../models/Notification');

/**
 * Starts all scheduled background tasks.
 * Called once from server.js after the database connection succeeds.
 */
const startCronJobs = () => {

  /**
   * Listing Expiry Job
   *
   * Production schedule: '0 0 * * *'  -> Every day at 00:00 (midnight)
   * Testing schedule:    '* * * * *'  -> Every 60 seconds
   *
   * FOR TESTING: Uncomment the testing line and comment out the production line.
   * Once verified, swap them back for production.
   */
  cron.schedule('0 0 * * *', async () => {  // PRODUCTION: midnight daily
  // cron.schedule('* * * * *', async () => {     // TESTING: every minute

    try {
      console.log('[CRON] Running listing expiry and archive check...');

      /**
       * STEP 1: 30-day expiry — available -> action_required
       *
       * Query items that:
       *   - Are still 'available' (not already hidden/sold/archived)
       *   - Were created more than 30 days ago
       *   - Have NOT been stamped yet (actionRequiredAt: null)
       *     This prevents duplicate notification generation and timestamp drift
       *     if the cron runs multiple times against the same item.
       *
       * We set both status AND actionRequiredAt together so the 7-day archive
       * window starts from the exact moment the seller is first notified.
       *
       * THRESHOLD:
       *   Testing:    1 * 60 * 1000               = 1 minute
       *   Production: 30 * 24 * 60 * 60 * 1000    = 30 days
       */
      // const thirtyDaysAgo = new Date(Date.now() - (1 * 60 * 1000)); // TESTING
      const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)); // PRODUCTION

      const expiryResult = await Item.updateMany(
        {
          status: 'available',
          createdAt: { $lte: thirtyDaysAgo },
          actionRequiredAt: null,
        },
        {
          $set: {
            status: 'action_required',
            actionRequiredAt: new Date(),
          },
        }
      );

      console.log(
        `[CRON] Expiry: ${expiryResult.modifiedCount} item(s) marked as 'action_required'.`
      );

      /**
       * STEP 2: 7-day no-response — action_required -> archived
       *
       * If a seller has not renewed or deleted their listing within 7 days of
       * receiving the action_required notification, the item is archived.
       *
       * We find items first (to get seller ID + title), then update them,
       * then create one persistent Notification per item so the seller has a
       * history record even after the item leaves 'action_required'.
       *
       * Duplicate prevention: We query items still in 'action_required' — once
       * archived they won't match again on the next cron run.
       *
       * THRESHOLD:
       *   Testing:    2 * 60 * 1000               = 2 minutes
       *   Production: 7 * 24 * 60 * 60 * 1000     = 7 days
       */
      // const sevenDaysAgo = new Date(Date.now() - (2 * 60 * 1000)); // TESTING
      const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)); // PRODUCTION

      // Find items to be archived before updating them
      const itemsToArchive = await Item.find(
        {
          status: 'action_required',
          actionRequiredAt: { $lte: sevenDaysAgo },
        },
        'seller title'   // Only fetch the fields we need
      );

      if (itemsToArchive.length > 0) {
        // Archive all matching items in one operation
        const archiveResult = await Item.updateMany(
          {
            status: 'action_required',
            actionRequiredAt: { $lte: sevenDaysAgo },
          },
          {
            $set: { status: 'archived' },
          }
        );

        console.log(
          `[CRON] Archive: ${archiveResult.modifiedCount} item(s) archived after 7-day no response.`
        );

        // Create one persistent Notification per archived item so the seller
        // retains a history record after the item leaves 'action_required'.
        const archiveNotifications = itemsToArchive.map((item) => ({
          userId: item.seller,
          type: 'archived',
          message: `Your item "${item.title || 'Untitled'}" was removed because no action was taken within 7 days.`,
          itemTitle: item.title || 'Untitled',
          itemId: item._id,
        }));

        await Notification.insertMany(archiveNotifications);
        console.log(`[CRON] Created ${archiveNotifications.length} archive notification(s).`);
      } else {
        console.log('[CRON] Archive: 0 item(s) to archive.');
      }

    } catch (error) {
      console.error(`[CRON] Listing expiry/archive failed: ${error.message}`);
    }
  });

  console.log('[CRON] Scheduled jobs initialized. Production thresholds: 30-day expiry, 7-day archive.');
};

module.exports = startCronJobs;
