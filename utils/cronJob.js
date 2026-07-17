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
          • Archive expired listings
          • Send reminder emails
          • Backup database
          • Delete old logs
          • Generate reports

* Backend vs Cron Job:
    - Normal API: Works only when user asks.
            User Request -> Backend Executes -> Response
    
    - Cron Job: Works automatically.
            Scheduled Time -> Backend Executes -> Task Completed

* How It Works:
    Server Starts -> connectDB() -> startCronJobs() -> Cron Scheduler Waits -> Scheduled Time Arrives -> Task Executes -> Waits Again

* Important:
    • Cron Job does NOT run continuously.
    • It waits for the scheduled time, executes the task, then waits again.
    • Always call connectDB() before startCronJobs() so database operations work correctly.

* node-cron Example:
    cron.schedule("0 0 * * *", () => { Runs every day at 12:00 AM });

* Project Example:
    Item Posted ───► 30 Days Pass ───► Mark Action Required ───► Wait 7 Days ───► Archive Item

* Interview Answer:
    "A Cron Job is a background task that runs automatically at a scheduled time without any user request. 
     It is used to automate repetitive tasks such as backups, sending emails, deleting old data, or updating 
     records. 
     In my Campus Marketplace project, a Cron Job runs every midnight to check listings older than 30 days, 
     marks them as 'Action Required', and later archives them if the seller does not respond."
 
* ─── Why do we need this? ───────────────────────────────────────────────────
   
  Problem: Students post items and then forget about them.
    After 30 days, a listing for "Books for Sale" is probably no longer relevant.
    Instead of showing stale listings forever, we automatically flag them.
 
    Flow:
      Day 1:  Student posts "My Old Laptop" → status: 'available'
      Day 15: Listing is still 'available' (only 15 days old)
      Day 30: ⏰ Cron fires → listing is now 30+ days old
              → status changes from 'available' → 'action_required'
              → Seller gets notified (future feature) to renew or archive it
              → Listing disappears from public search (getItems filters by 'available')
 
* ─── Cron Expression Cheat Sheet ────────────────────────────────────────────
 
    A cron expression has 5 fields (left to right):
 
      ┌────────────── Minute       (0 - 59)
      │  ┌───────────── Hour         (0 - 23)
      │  │  ┌──────────── Day of Month (1 - 31)
      │  │  │  ┌─────────── Month       (1 - 12)
      │  │  │  │  ┌────────── Day of Week  (0 - 7, where 0 and 7 = Sunday)
      │  │  │  │  │
      *  *  *  *  *
 
    Examples:
      '0 0 * * *'    → Every day at midnight (00:00)        ← We use this
      '* * * * *'    → Every minute (for testing only!)
      '0 6 * * *'    → Every 6 hours
      '0 9 * * 1'    → Every Monday at 9:00 AM
      '0 0 1 * *'    → First day of every month at midnight
 
*  ─── MongoDB Operators Used ─────────────────────────────────────────────────
 
    $lte (Less Than or Equal):
      Compares a field's value against a given value.
 
      Example:  { createdAt: { $lte: thirtyDaysAgo } }
      English:  "Find documents where createdAt is BEFORE (or exactly at) 30 days ago."
 
      Visual timeline:
 
        Past ◄──────────────────────────────────────────────────► Present
        │                                │                        │
        │  Items created here are OLD    │  Items created here    │
        │  createdAt <= thirtyDaysAgo    │  are still fresh       │
        │  ✅ MATCHED by $lte           │  ❌ NOT matched        │
        │                                │                        │
        ◄────────── 30+ days ───────────►│◄───── less than 30 ───►│
                                    thirtyDaysAgo               now
 
    updateMany():
      Updates ALL documents that match the filter in a single database operation.
      Much more efficient than finding each document and saving it one by one.
 
      Equivalent to SQL: UPDATE items SET status='action_required'
                         WHERE status='available' AND createdAt <= '2026-06-14'
 */

const cron = require('node-cron');  // Import the node-cron package to schedule background tasks.
const Item = require('../models/Item');  // Import the Item model to interact with the MongoDB collection for marketplace listings. 

/**
 * Starts all scheduled background tasks.
 * Called once from server.js after the database connection succeeds.
 */
const startCronJobs = () => {

  /* ── Listing Expiry Job: Runs at midnight every day ─────────────────────────
  
  Production schedule: '0 0 * * *'  → Every day at 00:00 (midnight)
  Testing schedule:    '* * * * *'  → Every 60 seconds (for development testing)
  
  🧪 FOR TESTING: Uncomment the line below and comment out the production line.
     Once you verify it works, swap them back! */
  cron.schedule('0 0 * * *', async () => {
  // cron.schedule('* * * * *', async () => {  // ← 🧪 UNCOMMENT THIS LINE FOR TESTING (runs every minute)

    try {
      console.log('⏰ [CRON] Running listing expiry check...');

/* ── Calculate the 30-day threshold date ─────────────────────────────────
      
  - Date.now() returns the current timestamp in milliseconds.
  - 30 * 24 * 60 * 60 * 1000 breaks down as:
      30 days × 24 hours × 60 minutes × 60 seconds × 1000 milliseconds = 2,592,000,000 milliseconds = exactly 30 days  
  - Subtracting this from Date.now() gives us a Date object representing exactly 30 days ago from right now.
  - Example:
        If today is July 14, 2026
        thirtyDaysAgo = June 14, 2026
        Any item created ON or BEFORE June 14 is considered expired. */
      const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));

/* ── Update all expired listings in one database operation ───────────────
      
  - Item.updateMany(filter, update):
      - filter: { status: 'available', createdAt: { $lte: thirtyDaysAgo } }
          → Find all items that are:
            1. Currently 'available' (we don't touch already hidden/sold items) by status: 'available'
            2. Created more than 30 days ago ($lte = less than or equal) by createdAt: { $lte: thirtyDaysAgo }
      
      - update: { status: 'action_required' }
          → Change their status to 'action_required'
          → This removes them from public search (getItems only shows 'available')
          → The seller can later choose to renew or archive the listing
      
  - `result` contains: { modifiedCount: N } — how many documents were updated. */
      const result = await Item.updateMany(
        { // filter
          status: 'available',
          createdAt: { $lte: thirtyDaysAgo },
        },
        { // update
          status: 'action_required',
        }
      );

/* ── Log the result ──────────────────────────────────────────────────────
      This appears in the terminal where `npm run dev` is running.
      If modifiedCount is 0, no items were old enough to expire — that's normal. */
      console.log(
        `✅ [CRON] Listing expiry complete. ${result.modifiedCount} item(s) marked as 'action_required'.`
      );
    } 
    catch (error) {
      // If the cron job fails (DB issue, etc.), log it but DON'T crash the server.
      // The cron will retry on the next scheduled run.
      console.error(`❌ [CRON] Listing expiry failed: ${error.message}`);
    }
  });

  console.log('📅 [CRON] Scheduled jobs initialized. Listing expiry runs at midnight daily.');
};

module.exports = startCronJobs;
