/**
 @file controllers/itemController.js   : This file contains the controller for items. Controllers contain the business logic.
                                            Example: Create Item, Update Item, Delete Item, Get Item
 @description :This file contains all the logic related to marketplace items.
                For example: Upload item, Save item, Delete item, Update item
            Routes only receive requests. Controllers decide what should happen.


 ─── Cloudinary Upload Flow (Detailed) ───────────────────────────────────────
 
* Problem:
    - Multer stores uploaded files as Buffers.
    - Cloudinary's upload_stream() API is designed to receive a Readable Stream, not a Buffer.
    - Therefore, the Buffer must be converted into a Readable Stream before uploading.

* Solution:
  Step 1: What happens when a user uploads an image?
      - Suppose the user uploads : Laptop.jpg
          - The request reaches your Express server. React -> Express -> Multer
          - Now Multer has to decide where to keep this image.
            - Since you are using : multer.memoryStorage() -> Multer stores the image inside RAM, not on disk.
                so flow is : React -> Express -> Multer -> Ram -> Buffer
                when multer finishes, req.file.buffer contains the raw bytes of the image.

  Step 2: What exactly is a Buffer? 
      - A Buffer is simply raw binary data stored in memory.
      - Think of it like this. : Image
                                  ↓
                              010101010101
                              111001001010
                              101010101111
                              001010100101
                  - These are the actual bytes of the image.
                  - Node.js stores these bytes inside a Buffer.
                  - So, req.file.buffer  contains the entire image.

  Step 3: Why doesn't Cloudinary accept a Buffer?
      - Because Cloudinary's upload_stream() API is designed to work with Streams.
      - Cloudinary expects data to arrive little by little. Not all at once. 
      - so, we send data in small chunks (stream) instead of sending the entire image at once (buffer).
      - so, we need to convert the Buffer into a Readable Stream before sending it to Cloudinary.
        - send a Buffer (entire image) at once → Cloudinary cannot handle it.
        - send a Stream (image in small chunks) → Cloudinary can handle it.
            - Buffer → full bucket of water
            - stream → pipe that water flows through continuously

  step 4: How do we convert a Buffer into a Readable Stream?
      - We use the `streamifier` package to wrap the Buffer into a Readable Stream.
      - streamifier.createReadStream(buffer) takes a Buffer and returns a Readable Stream.
      - Then we can pipe that Readable Stream into Cloudinary's upload_stream().

  step 5: How do we upload the Readable Stream to Cloudinary?
      - We call cloudinary.uploader.upload_stream(options, callback)
      - This returns a Writable Stream that points to Cloudinary's servers.
      - We then pipe our Readable Stream (from step 4) into this Writable Stream.
      - Cloudinary receives the image in small chunks, stores it, and calls back with the result.
      

 Buffer (req.files[i].buffer)
       │
       ▼
   streamifier.createReadStream(buffer)    ← Wraps Buffer as a Readable Stream
       │
       │  .pipe()                          ← Connects Readable → Writable
       │
       ▼
   cloudinary.uploader.upload_stream(...)  ← Writable Stream → Cloudinary servers
       │
       ▼
   callback({ secure_url, public_id, ... }) ← Cloudinary's response after storing
 
  We wrap this in a Promise so we can use async/await cleanly.
  All uploads run in parallel using Promise.all() for maximum speed.
 */

const cloudinary    = require('../config/cloudinary'); 
const streamifier   = require('streamifier'); // import streamifier to convert Buffer → Readable Stream
const Item          = require('../models/Item');


// ─── Helper: Upload a Single Buffer to Cloudinary ────────────────────────────

/** The main idea is very simple:
        - Multer gives us the image in Buffer form in ram. Cloudinary cannot directly upload a Buffer using 
          upload_stream(). So we convert the Buffer into a Stream and send it to Cloudinary.
 
  @param {Buffer} fileBuffer - Raw binary data of the image (from Multer memoryStorage). 
  @param {string} folder     - The Cloudinary folder to store images in.
  @returns {Promise<object>} - Resolves with Cloudinary's result object ({ secure_url, public_id, ... }).
 */


/* What does this line do?
    - We are creating a helper function named uploadToCloudinary.
    - This function's job is: Take one image , Upload it to Cloudinary and Return the upload result.
    - It accepts two parameters.   (fileBuffer , folder)
      - Parameter 1 : fileBuffer
          - This is the actual image. Not a file path, Not a URL.
          - It is the binary data stored in memory.
          - Example:
              Laptop.jpg -> Multer memoryStorage -> Buffer
          - Think of a Buffer as: "The image stored temporarily in the server's RAM."
      - Parameter 2 : folder
          - This tells Cloudinary where to save the image.
          - Example : folder = "campus_marketplace/items"
          - Then Cloudinary stores it like
                Cloudinary -> campus_marketplace -> items -> laptop.jpg
          - This keeps your Cloudinary account organized.
*/          
const uploadToCloudinary = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {     // We return a Promise so we can use async/await in the controller.    
    /* ── Step 1: Create a Cloudinary upload stream ──────────────────────────
  * const uploadStream = cloudinary.uploader.upload_stream( ... )
      - This creates an upload connection with Cloudinary.
      - Imagine :
            Your Server
                ║
                ║
                ║
            Cloudinary
        - A pipe is opened.
      - Cloudinary is now waiting for image data 
      
  * upload_stream
      - Notice : we use 'upload_stream' not 'upload'
              upload : This function uploads data from a file path or URL, but
              upload_stream : uploads the image as a stream. Instead of sending the entire image at once, 
                     Node.js sends it to Cloudinary in small chunks. This is more memory-efficient, especially 
                    for large files."
      - Meaning : 
          - Cloudinary receives the image in small chunks (segments) through a stream instead of receiving the 
            entire file at once. 
      - A "stream" means the data flows continuously in pieces.
      - example : Imagine you have a 10 MB image.
        - Without a stream
            - The entire 10 MB image is sent at once.
                10 MB Image
                    ↓
                Cloudinary

        - With a stream (upload_stream())
            - The image is divided into many small chunks.
                10 MB Image
                    ↓
                Chunk 1 (64 KB)
                    ↓
                Chunk 2 (64 KB)
                    ↓
                   ...
                   ...
                    ↓
                Last Chunk
                    ↓
                Cloudinary
      */
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,        // Save this image inside this folder. Example: Cloudinary -> campus_marketplace -> items -> laptop.jpg
        resource_type: 'image', // This tells Cloudinary "This file is an image." Cloudinary also supports : image , video , raw
      }, 
      // Callback Function : This callback fires when Cloudinary finishes (success or failure). 
      (error, result) => {
        if (error) { // Cloudinary returned an error — reject the Promise.
          reject(error);
        } else {  
          resolve(result);
          /* Suppose upload succeeds. Cloudinary returns something like
                            {
                              secure_url:"https://....",
                              public_id:"abc123",
                              width:1200,
                              height:800
                            } 
          */
        }
      }
    );

    /* ── Step 2: Convert Buffer → Readable Stream ───────────────────────────
    Multer's memoryStorage gives us `fileBuffer` (a raw Node.js Buffer).
    Cloudinary's upload_stream() API is designed to work with Streams or Readable Stream.
    `streamifier.createReadStream()` wraps the Buffer in a Readable Stream.

    What Cloudinary Wants
      - Cloudinary upload_stream cannot read a Buffer directly.
      - It wants a Readable Stream.
      - Imagine :
          A Buffer is like -> A full bucket of water.
          A Stream is like -> A pipe that water flows through continuously
          
      - Cloudinary wants the pipe, not the bucket.
    
    streamifier : This library converts buffer into a Readable Stream. It allows us to send the image in 
                  small chunks instead of all at once.
                  
      - Nothing changes in the image.
      - Only its format changes.

    What is a Readable Stream?
      - Think of : 100 MB image
      - Instead of sending : 100 MB -> at once
      - Node sends
          Small chunk -> Small chunk -> Small chunk -> Small chunk 
      - This is called a Stream.
      - Streams use less memory.
    */
    const readableStream = streamifier.createReadStream(fileBuffer);

    /* ── Step 3: Pipe the data ──────────────────────────────────────────────
              Readable Stream       ->    Bucket
                  ↓                         ↓
                Pipe                ->     Pipe
                  ↓                         ↓                    
        Cloudinary Upload Stream    ->     Tank

    `.pipe()` connects the Readable (our image bytes) to the Writable (Cloudinary's upload endpoint). 
    Node.js automatically pumps chunks of data from source → destination until the buffer is exhausted. 
    */
    readableStream.pipe(uploadStream);
  });
};



// ─── Controller: Create Item ─────────────────────────────────────────────────

/**
  @controller createItem   → Name of this controller function.
  @route   POST /api/items   → Which API endpoint calls this function.
  @access  Private (JWT required — set by protect middleware)  → Only logged-in users can use this API.
  @desc    Uploads images to Cloudinary and saves a new Item to MongoDB.  → What this API does.
 */

const createItem = async (req, res) => {
  try {
    /* ── Step 1: Verify at least 1 image was uploaded ───────────────────────
    When Multer receives uploaded images, it stores them inside - req.files
    * Suppose user uploads :- image1.jpg , image2.jpg , image3.jpg
      Then , 
          req.files -> becomes -> [file1, file2, file3]
          If user uploads nothing -> []
          if multer does not receive any file, req.files will be undefined.
    */
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload at least one image for your listing.',
      });
    }

    /* ── Step 2: Extract text fields from request body ──────────────────────
    - Object Destructuring
    - Where did these values come from?
        React sends :
              Title, Description, Price, Category, College Name, Hostel, RoomNumber 
        Multer automatically stores them inside :
                                                req.body
        Multer parses them and puts them in req.body, just like express.json() would. */
    const {
      title,
      description,
      price,
      category,
      collegeName,
      hostelName,
      roomNumber,
    } = req.body;


    /* ── Step 3: Upload ALL images to Cloudinary in parallel ────────────────
        * const uploadPromises = 
            Here we create an array. But this array contains : Promises , not URLs.
              promise contains : A Promise contains the state of an asynchronous task, here the asynchronous task is : Uploading an image to Cloudinary, so it contains the state of that upload.
        * req.files.map()
            Suppose : 3 images , map() will run once for every image.
        * uploadToCloudinary(file.buffer, 'campus_marketplace/items')     
            - Each time map() runs, it calls uploadToCloudinary() which returns a Promise.
            - file.buffer => The raw binary data of the image (from Multer memoryStorage).
            - 'campus_marketplace/items' => The Cloudinary folder to store images in.
        
        * After map
            - [ Promise, Promise, Promise ] 
            - No upload has finished yet, it contains Just promises.        
          */
    const uploadPromises = req.files.map((file) =>
      uploadToCloudinary(file.buffer, 'campus_marketplace/items') // Returns a Promise for each file
    );

    /*
      * Promise.all(uploadPromises) 
          - Waits for all the Promises to resolve (or any to reject).
          - If all succeed, it returns an array of Cloudinary result objects.
          - If any fail, it throws an error and we catch it in the catch block.
          - Example: 3 images → 3 Promises → all 3 run simultaneously.
          - suppose : 
              - Image1 takes 2 sec , Image2 takes 3 sec , Image3 takes 4 sec to upload.
              - Without Promise.all
                    Upload Image1 -> takes 2 sec
                    Upload Image2 -> takes 3 sec
                    Upload Image3 -> takes 4 sec
                  Total time = 2 + 3 + 4 = 9 sec
              - With Promise.all
                    All uploads start together.
                    Total time = 4 sec  
            
          - const cloudinaryResults =
              Now uploads are finished, We receive something like
                [
                  {
                    secure_url:"https://..."
                  },
                  {
                    secure_url:"https://..."
                  },
                  {
                    secure_url:"https://..."
                  }
                ]   
    */
    const cloudinaryResults = await Promise.all(uploadPromises); // Waits for all uploads to finish (or any to fail)


/* ── Step 4: Extract image data from Cloudinary results ──────────────────
              look media notes of models/items.js file
    Each Cloudinary result object contains many fields. We extract TWO:
      - secure_url  → The permanent HTTPS link to the stored image.
      - public_id   → Cloudinary's unique identifier for this asset.

    WHY store public_id?
      to delete the omage from cloudinary 

    Example Cloudinary result:
      {
        secure_url: "https://res.cloudinary.com/your_cloud/image/upload/v1234/campus_marketplace/items/abc123.jpg",
        public_id:  "campus_marketplace/items/abc123",
        width: 1200, height: 800, format: "jpg", ...
      }
    We only keep url and publicId — the rest is metadata we don't need.
    */
    const imageData = cloudinaryResults.map((result) => ({
      url:      result.secure_url,  // Permanent HTTPS link (displayed on frontend)
      publicId: result.public_id,   // Cloudinary asset ID (used for future delete/replace)
    }));

    /* ── Step 5: Create the Item document in MongoDB ────────────────────────
    We use `Item.create()` which is shorthand for `new Item({...}).save()`.
    
    IMPORTANT: `seller` is set from `req.user.id` — NOT from req.body.
    `req.user` was attached by the `protect` middleware after JWT verification.
    This means a user can NEVER fake their seller identity — it always comes
    from the verified JWT, making it tamper-proof. 
    where req.body : Data sent by the client (browser/mobile app), which controls by the client so it is not secure */
    const newItem = await Item.create({
      title,
      description,
      price:       Number(price),   // req.body values are strings — convert price to Number
      category,
      collegeName,
      hostelName,
      roomNumber,
      images:      imageData,        // Array of { url, publicId } objects (not plain strings anymore)
      seller:      req.user.id,     // From JWT via protect middleware (tamper-proof) , not req.body.seller bcz users can change it 
    });

    // ── Step 6: Return the newly created item ──────────────────────────────
    res.status(201).json({
      success: true,
      message: 'Item listed successfully!',
      data: newItem,
    });

  } 
  catch (error) {
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


/* Complete Flow
        React
          ↓
        User selects image
          ↓
        Multer
          ↓
        Buffer
          ↓
        uploadToCloudinary()
          ↓
        Convert Buffer
          ↓
        Readable Stream
          ↓
        pipe()
          ↓
        Cloudinary Upload Stream
          ↓
        Cloudinary stores image
          ↓
        Returns secure_url
          ↓
        MongoDB stores URL

Why don't we store images in MongoDB?
  - Because images are large.
  - Instead we do
        MongoDB
          ↓
        Title
          ↓
        Price
          ↓
        Description
          ↓
        Image URL

The actual image stays in Cloudinary.
*/




// ═════════════════════════════════════════════════════════════════════════════
//  DAY 4: Advanced Database Filtering, Moderation & Reporting
// ═════════════════════════════════════════════════════════════════════════════


// ─── Controller: Get Items (Search, Filter, Sort) ────────────────────────────

/*
  @controller getItems  — name of this controller function.
  @route   GET /api/items  —  Frontend calls GET to /api/items and This controller executes.
  @access  Public     —      anyone can browse the marketplace without logging in. No login required.
  @desc    — Returns a list of items with dynamic search, filtering, and sorting depending on what the user sends.

* ─── How the Dynamic Filter Object Works ──────────────────────────────────────

  We start with a base filter: { status: 'available' }
    This ensures that hidden, sold, archived, or flagged items are NEVER shown.

  Then we conditionally add more filters based on what the user sends in req.query.

  Example 1: GET /api/items
    → filter = { status: 'available' }
    → returns ALL available items

  Example 2: GET /api/items?category=Books
    → filter = { status: 'available', category: 'Books' }
    → returns only available Books

  Example 3: GET /api/items?search=laptop&collegeName=MITS
    → filter = {
        status: 'available',
        collegeName: 'MITS',
        $or: [
          { title: { $regex: 'laptop', $options: 'i' } },
          { description: { $regex: 'laptop', $options: 'i' } }
        ]
      }
    → returns available items from MITS where title OR description contains "laptop"

* ─── MongoDB Operators Used ────────────────────────────────────────────────────

  * $regex  : Pattern matching - A MongoDB query operator that matches strings using regular expressions.
              Suppose : Database contains : Old Laptop , Gaming Laptop , Laptop Bag , Phone
                        Search : lap 
                        Matches : Old Laptop , Gaming Laptop , Laptop Bag 
                          because lap exists inside.

  * $options: 'i'  : The 'i' flag makes the regex case-insensitive.
              Without 'i': "laptop" would NOT match "Laptop" or "LAPTOP"
              With 'i': "laptop" matches "Laptop", "LAPTOP", "lApToP", etc.

  * $or: [condition1, condition2] → Returns the document if EITHER condition1 OR condition2 is true.     
              A logical operator. Returns documents that match at LEAST ONE of the conditions in its array. 
              Suppose : Database contains : Title -> Gaming Laptop , Description -> 8GB RAM
                        Search : RAM
                        Title -> No Match , Description -> Match
                        Should document return? Yes. -> That's why , we used $or
                        Meaning : Either Title OR Description must match.       
 */

const getItems = async (req, res) => {
  try {
    /* ── Step 1: Extract query parameters ────────────────────────────────────
    req.query contains the 'key-value pairs' after the ? in the URL.
    Example: URL : GET /api/items?search=laptop&category=Electronics&collegeName=MITS
      Express creates :
              → req.query = { search: 'laptop', category: 'Electronics', collegeName: 'MITS' }
                If a parameter is not provided, it will be undefined. */
    const { search, category, collegeName } = req.query;

    /* ── Step 2: Build the base filter ───────────────────────────────────────
    CRITICAL: We always start with status: 'available'.
    This is the DEFAULT safety net — it ensures that reported/hidden/sold items
    are NEVER returned to the public browsing API.
    
    Without this filter, a user could see hidden or flagged items,
    which would defeat the purpose of our entire moderation system. */
    const filter = { status: 'available' };

    /* ── Step 3: Conditionally add category filter ───────────────────────────
    If the frontend sends ?category=Books, we add it to the filter.
    Now filter becomes : { status:"available" , category:"Books" }
    This is an EXACT match — "Books" won't match "books" or "BOOKS"
    (unlike $regex). Mongoose will query: { status: 'available', category: 'Books' } */
    if (category) {
      filter.category = category;
    }

    /* ── Step 4: Conditionally add collegeName filter ─────────────────────────
    If the frontend sends ?collegeName=MITS, we add it to the filter.
    Now filter becomes : { status:"available", category:"Books", collegeName:"MITS" }
    Same logic — an exact match on the college name.
    This allows students to browse items listed only on their campus. */
    if (collegeName) {
      filter.collegeName = collegeName;
    }

/*  ── Step 5: Conditionally add search (fuzzy match) ──────────────────────
    If the user provides a search term, we use MongoDB's $regex operator to perform a case-insensitive substring search.
    
    We wrap it in $or so the search term is checked against BOTH fields:
      - title       → "Old Laptop for Sale" matches "laptop"
      - description → "8GB RAM, good condition" matches "ram"
    
    Suppose the frontend sends : GET /api/items?search=Laptop  or  user search Laptop
    after the Destructuring , search=Laptop 
    Filter becomes
          filter.$or=[ 
                  { title:{ $regex:Laptop, $options:"i" } }, 
                  { description:{ $regex:Laptop , $options:"i" } }
                ]
      Meaning : Find documents whose title contains Laptop OR description contains Laptop.
    */
    if (search) {
      filter.$or = [
        { title:       { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    
    /* ── Step 6: Execute the query ───────────────────────────────────────────
    .find(filter)     → Returns all documents matching our filter object  , 
                        suppose : filter = { status:"available", category:"Books" }
                        MongoDB automatically executes : SELECT * FROM Items WHERE status='available' AND category='Books'
                        and return all documents matching our filter object
 .sort(createdAt:-1)  → Sorts results newest to oldest (-1 means newest to oldest , 1 means oldest to newest)
    .populate(...)    → Replaces the seller ObjectId with actual user data (name, email)
                        This is a Mongoose JOIN — it reads from the User collection
                        and inserts the matching document in place of the ObjectId.
    
    Note: hostelName and roomNumber have `select: false` in the schema,
    so they are automatically excluded from all queries — no extra work needed here. */
    const items = await Item.find(filter)
      .sort({ createdAt: -1 })            // Newest listings first
      .populate('seller', 'name email');   // Show seller name & email, hide password

    // ── Step 7: Return results ──────────────────────────────────────────────
    res.status(200).json({
      success: true,
      count: items.length,  // Useful for the frontend to display "23 items found"
      data: items, 
    });

  } 
  catch (error) {
    console.error(`Get Items Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching items. Please try again.',
    });
  }
};


// ─── Controller: Report Item ─────────────────────────────────────────────────

/** 
  @controller reportItem  —  The controller function name is
  @route   PUT /api/items/:id/report  —   Which API endpoint calls this function.
  @access  Private (JWT required — only logged-in users can report)
  @desc    Allows a user to report a listing. If 5 unique users report an item,
           it is automatically hidden from the marketplace.

  ─── @The Auto-Hide Moderation System ──────────────────────────────────────────

  This is a community-driven moderation approach:

  reports: 0  → Item is visible       (status: 'available')
  reports: 1  → Item is visible       (1 report is not enough to hide)
  reports: 2  → Item is visible
  reports: 3  → Item is visible
  reports: 4  → Item is visible
  reports: 5  → 🚨 THRESHOLD REACHED → Item auto-hides (status: 'hidden')

  Why 5 reports?
    - 1 report could be a mistake or a personal grudge.
    - 5 reports from 5 DIFFERENT users is a strong community signal
      that something is genuinely wrong with the listing.
    - The admin can review hidden items later and decide to restore or delete them.

  Duplicate Protection:
    - Before adding a report, we check if this user already reported this item.
    - This prevents a single angry user from reporting the same item 5 times
      to get it hidden. Each report MUST come from a unique user.
 */
const reportItem = async (req, res) => {
  try {
/*  ── Step 1: Find the item by ID ─────────────────────────────────────────
    req.params.id comes from the URL: PUT /api/items/abc123/report → id = 'abc123'
      Express creates req.params={ id:"abc123" }
      Then MongoDB searches _id="abc123" Returns the item.
        Why findById()? -- Because every item has a unique MongoDB ObjectId. */
    const item = await Item.findById(req.params.id);

    // ── Step 2: Handle item not found ───────────────────────────────────────
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found.',
      });
    }

/*  ── Step 3: Duplicate report check ──────────────────────────────────────
    req.user.id  → The ID of the currently logged-in user (from JWT via protect middleware)
    
    Step 1 : Suppose your database contains:
        item.reports = [ ObjectId("user1"), ObjectId("user2"), ObjectId("user3") ];
    Step 2 : item.reports.map((id) => id.toString())
        map() goes through every element of the array one by one and converted object to string(ObjectId("user1") to "user1").
        After map(), the array becomes [ "user1", "user2", "user3" ]
    Step 3 : .includes() checks if the array contains this value.
        Now suppose the currently logged-in user is : req.user.id = "user2";
          Then this runs .includes(req.user.id.toString()) , which becomes .includes("user2")    
        -> it check "Is 'user2' present in this array?" 
        the ans is yes , so it return true 
            so, const alreadyReported = true;     */
    const alreadyReported = item.reports
      .map((id) => id.toString())       // Convert each ObjectId → string
      .includes(req.user.id.toString()); // Check if current user's ID is in the array
  
    if (alreadyReported) {
      return res.status(400).json({
        success: false,
        message: 'You have already reported this item.',
      });
    }

/*  ── Step 4: Add the reporter's ID to the reports array ──────────────────
    We push the current user's ObjectId into the reports array.
    This user is now recorded as having reported this item. */
    item.reports.push(req.user.id);

/*  ── Step 5: Auto-Hide Logic (Community Threshold) ───────────────────────
    After pushing the new report, check if we've hit the threshold of 5.
    If 5 or more unique users have reported this item, automatically hide it.
    
    Why >= 5 instead of === 5?
      - Safety net: if reports somehow reaches 6, 7, etc. (edge case),
        we still want it to be hidden. >= is more robust than ===.
    
    What happens when status changes to 'hidden'?
      - Our getItems controller has `filter = { status: 'available' }`.
      - Since this item's status is now 'hidden', it will NO LONGER appear
        in any public search or browse results. It effectively vanishes from
        the marketplace until an admin reviews it. */
    let wasAutoHidden = false; // Track this for the response message

    if (item.reports.length >= 5) {
      item.status = 'hidden';
      wasAutoHidden = true;
    }

    // ── Step 6: Save the updated item to MongoDB ────────────────────────────
    await item.save();

    // ── Step 7: Return the response ─────────────────────────────────────────
    res.status(200).json({
      success: true,
      message: wasAutoHidden
        ? 'Report received. This item has been automatically hidden due to multiple reports and is now under review.'
        : 'Report received. Thank you for helping keep the marketplace safe.',
      totalReports: item.reports.length,
      itemStatus: item.status,
    });

  } 
  catch (error) {
    console.error(`Report Item Error: ${error.message}`);

    // Handle invalid MongoDB ObjectId format in the URL
    // e.g., /api/items/NOT_A_VALID_ID/report
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Item not found. Invalid ID format.',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while reporting the item. Please try again.',
    });
  }
};


module.exports = { createItem, getItems, reportItem };