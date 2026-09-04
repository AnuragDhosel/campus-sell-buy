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

const cloudinary     = require('../config/cloudinary'); 
const streamifier    = require('streamifier'); // import streamifier to convert Buffer → Readable Stream
const Item           = require('../models/Item');
const Notification   = require('../models/Notification'); // Persistent notification records (deleted/archived/renewed)


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
    let imageData = [];

    /* ── Mode A: Frontend sent pre-uploaded Cloudinary URLs (JSON body) ──────
       Used when frontend uploads directly to Cloudinary (e.g. on Vercel where
       multipart/form-data bodies are size-limited at the serverless edge).
       
       Expected payload:
         {
           images: [ { url: "https://res.cloudinary.com/...", publicId: "campus_marketplace/items/..." }, ... ],
           title, description, price, category, collegeName, hostelName, roomNumber, sellerPhoneNumber
         }
    */
    if (req.body.images && Array.isArray(req.body.images) && req.body.images.length > 0) {
      // Validate each image entry
      for (const img of req.body.images) {
        if (!img.url || !img.publicId) {
          return res.status(400).json({
            success: false,
            message: 'Invalid image data. Each image must have url and publicId.',
          });
        }
      }
      imageData = req.body.images.map((img) => ({
        url:      img.url,
        publicId: img.publicId,
      }));
    }

    /* ── Mode B: Files uploaded via Multer (traditional multipart) ───────────
       Used in local dev or environments without body size restrictions.
    */
    else if (req.files && req.files.length > 0) {
      /* ── Step 3: Upload ALL images to Cloudinary in parallel ────────────────
          req.files.map() runs once for each uploaded file.
          uploadToCloudinary() returns a Promise for each file.
          Promise.all() waits for ALL uploads to finish in parallel.
      */
      const uploadPromises = req.files.map((file) =>
        uploadToCloudinary(file.buffer, 'campus_marketplace/items')
      );
      const cloudinaryResults = await Promise.all(uploadPromises);

      imageData = cloudinaryResults.map((result) => ({
        url:      result.secure_url,
        publicId: result.public_id,
      }));
    }

    /* ── No images provided at all ──────────────────────────────────────────── */
    else {
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
      sellerPhoneNumber,
      phoneNumber,
      phone,
    } = req.body;

    const contactPhone = sellerPhoneNumber || phoneNumber || phone;

    // Field validations
    if (!hostelName || !hostelName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the hostel name for pickup coordination.',
      });
    }

    if (!roomNumber || !roomNumber.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the room number for pickup coordination.',
      });
    }

    if (!contactPhone || !contactPhone.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid contact phone number.',
      });
    }

    const phoneRegex = /^(?:\+91[\-\s]?)?[1-9]\d{9}$/;
    if (!phoneRegex.test(contactPhone.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit mobile number.',
      });
    }

    /* ── Step 5: Create the Item document in MongoDB ──────────────────────── */
    const newItem = await Item.create({
      title,
      description,
      price:             Number(price),   // req.body values are strings — convert price to Number
      category,
      collegeName,
      hostelName,
      roomNumber,
      sellerPhoneNumber: contactPhone.trim(),
      images:            imageData,        // Array of { url, publicId } objects
      seller:            req.user.id,     // From JWT via protect middleware
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
    console.error(`Create Item Stack: ${error.stack}`);
    console.error(`Create Item Error Name: ${error.name}`);

    // Handle Mongoose validation errors specifically for a cleaner response
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
      });
    }

    // Cloudinary errors
    if (error.http_code || error.message?.includes('cloudinary')) {
      return res.status(500).json({
        success: false,
        message: `Image upload failed: ${error.message}`,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Server error while creating the listing. Please try again.',
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
    /* ── Step 1: Extract query parameters ──────────────────────────────────── */
    const { search, category, collegeName, seller, status } = req.query;

    /* ── Step 2: Build the filter ──────────────────────────────────────────── */
    const filter = {};
    if (status) {
      filter.status = status;
    } else if (!seller) {
      filter.status = 'available';
    }

    if (seller) {
      filter.seller = seller;
    }

    /* ── Step 3: Conditionally add category filter ─────────────────────────── */
    if (category) {
      filter.category = category;
    }

    /* ── Step 4: Conditionally add collegeName filter ───────────────────────── */
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


// ─── Controller: Get Item By ID ──────────────────────────────────────────────

/**
 * @controller getItemById
 * @route   GET /api/items/:id
 * @access  Public (no token required)
 * @desc    Returns a single marketplace item by its MongoDB ObjectId.
 *          Populates the seller field with name and email (no password).
 *          hostelName and roomNumber are excluded automatically (select: false in schema).
 */
const getItemById = async (req, res) => {
  try {
    // Attempt token verification if Authorization header exists (to check if requester is the seller)
    let requesterId = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        requesterId = decoded.id;
      } catch (e) {
        // invalid token — treat as unauthenticated public
      }
    }

    // Select private fields so we can return them ONLY if the requester is the item's seller
    const item = await Item.findById(req.params.id)
      .select('+hostelName +roomNumber +sellerPhoneNumber')
      .populate('seller', 'name email');

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found.',
      });
    }

    const itemObj = item.toObject();
    const sellerId = typeof item.seller === 'object' ? item.seller?._id : item.seller;
    const isOwner = requesterId && sellerId && String(sellerId) === String(requesterId);

    // If requester is NOT the item owner/seller, purge private fields
    if (!isOwner) {
      delete itemObj.hostelName;
      delete itemObj.roomNumber;
      delete itemObj.sellerPhoneNumber;
    }

    res.status(200).json({
      success: true,
      data: itemObj,
    });
  } catch (error) {
    console.error(`Get Item By ID Error: ${error.message}`);

    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Item not found. Invalid ID format.',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while fetching the item. Please try again.',
    });
  }
};


// ─── Controller: Update Item ─────────────────────────────────────────────────

/**
 * @controller updateItem
 * @route   PUT /api/items/:id
 * @access  Private (JWT required — ONLY owner/seller can update)
 * @desc    Updates a seller's item fields while keeping system/moderation fields intact.
 */
const updateItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found.',
      });
    }

    // Ownership check: only actual seller can update
    const sellerId = typeof item.seller === 'object' ? item.seller._id : item.seller;
    if (sellerId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this listing.',
      });
    }

    const {
      title,
      description,
      price,
      category,
      condition,
      collegeName,
      hostelName,
      roomNumber,
      sellerPhoneNumber,
      phoneNumber,
      phone,
    } = req.body;

    // Field Validations if provided
    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({ success: false, message: 'Item name is required.' });
      }
      if (title.trim().length > 150) {
        return res.status(400).json({ success: false, message: 'Title cannot exceed 150 characters.' });
      }
      item.title = title.trim();
    }

    if (description !== undefined) {
      if (!description.trim()) {
        return res.status(400).json({ success: false, message: 'Description is required.' });
      }
      if (description.trim().length > 2000) {
        return res.status(400).json({ success: false, message: 'Description cannot exceed 2000 characters.' });
      }
      item.description = description.trim();
    }

    if (price !== undefined) {
      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice <= 0) {
        return res.status(400).json({ success: false, message: 'Price must be greater than ₹0.' });
      }
      item.price = numPrice;
    }

    if (category !== undefined) {
      if (!category) {
        return res.status(400).json({ success: false, message: 'Category is required.' });
      }
      item.category = category;
    }

    if (condition !== undefined) item.condition = condition;
    if (collegeName !== undefined) item.collegeName = collegeName.trim();
    if (hostelName !== undefined) item.hostelName = hostelName.trim();
    if (roomNumber !== undefined) item.roomNumber = roomNumber.trim();

    const contactPhone = sellerPhoneNumber || phoneNumber || phone;
    if (contactPhone !== undefined) {
      const phoneRegex = /^(?:\+91[\-\s]?)?[1-9]\d{9}$/;
      if (!phoneRegex.test(contactPhone.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid 10-digit mobile number.',
        });
      }
      item.sellerPhoneNumber = contactPhone.trim();
    }

    await item.save();

    res.status(200).json({
      success: true,
      message: 'Listing updated successfully!',
      data: item,
    });
  } catch (error) {
    console.error(`Update Item Error: ${error.message}`);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Listing not found. Invalid ID format.',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while updating the listing. Please try again.',
    });
  }
};


// ─── Controller: Delete Item ─────────────────────────────────────────────────

/**
 * @controller deleteItem
 * @route   DELETE /api/items/:id
 * @access  Private (JWT required — ONLY owner/seller can delete)
 * @desc    Deletes a seller's item from MongoDB, cleans up associated handshakes and Cloudinary images.
 */
const deleteItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found.',
      });
    }

    // Ownership check: only actual seller can delete
    const sellerId = typeof item.seller === 'object' ? item.seller._id : item.seller;
    if (sellerId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this listing.',
      });
    }

    // Clean up Cloudinary images if publicId exists
    if (Array.isArray(item.images)) {
      for (const img of item.images) {
        if (img.publicId) {
          try {
            await cloudinary.uploader.destroy(img.publicId);
          } catch (cloudErr) {
            console.error(`Cloudinary image deletion failed for ${img.publicId}:`, cloudErr.message);
          }
        }
      }
    }

    // Clean up associated handshake documents
    const Handshake = require('../models/Handshake');
    await Handshake.deleteMany({ itemId: item._id });

    // Delete item from MongoDB
    await item.deleteOne();

    // Create a persistent notification so the seller retains deletion history.
    // This runs AFTER successful deletion — no notification is created if deletion fails.
    try {
      await Notification.create({
        userId: sellerId,
        type: 'deleted',
        message: `Your item "${item.title || 'Untitled'}" has been deleted.`,
        itemTitle: item.title || 'Untitled',
        itemId: null, // item is gone — no valid ref
      });
    } catch (notifErr) {
      // Non-critical: log but don't block the response
      console.error('Failed to create deletion notification:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Listing deleted successfully.',
    });
  } catch (error) {
    console.error(`Delete Item Error: ${error.message}`);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Listing not found. Invalid ID format.',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while deleting the listing. Please try again.',
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

    // Prevent self-reporting
    const sellerId = typeof item.seller === 'object' ? item.seller?._id : item.seller;
    if (sellerId && sellerId.toString() === req.user.id.toString()) {
      return res.status(200).json({
        success: false,
        isOwnItem: true,
        message: 'You cannot report your own item.',
      });
    }

    const alreadyReported = item.reports
      .map((id) => (id?._id || id).toString())       // Convert each ObjectId → string
      .includes(req.user.id.toString()); // Check if current user's ID is in the array
  
    if (alreadyReported) {
      return res.status(200).json({
        success: true,
        alreadyReported: true,
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


// ─── Controller: Get Active Colleges ─────────────────────────────────────────

/**
 * @controller getColleges
 * @route   GET /api/items/colleges
 * @access  Public
 * @desc    Returns a list of distinct college names that have at least one
 *          available item on the marketplace, along with a count per college.
 *          Used to populate the College filter dropdown on the marketplace.
 */
const getColleges = async (req, res) => {
  try {
    const colleges = await Item.aggregate([
      // Only include available (marketplace-visible) items
      { $match: { status: 'available', collegeName: { $exists: true, $ne: '' } } },
      // Group by college name and count listings per college
      { $group: { _id: '$collegeName', count: { $sum: 1 } } },
      // Sort alphabetically
      { $sort: { _id: 1 } },
      // Shape the output
      { $project: { _id: 0, collegeName: '$_id', count: 1 } },
    ]);

    res.status(200).json({
      success: true,
      count: colleges.length,
      data: colleges,
    });
  } catch (error) {
    console.error(`Get Colleges Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching college list.',
    });
  }
};


// ─── Controller: Renew Listing ────────────────────────────────────────────────

/**
 * @controller renewItem
 * @route   PUT /api/items/:id/renew
 * @access  Private (JWT required — ONLY the seller who owns this item can renew)
 * @desc    Resets an action_required item back to available and restarts the 30-day
 *          expiry clock by resetting createdAt to the current time.
 *
 *   Security checks:
 *     1. Item must exist.
 *     2. Authenticated user must be the seller (ownership check).
 *     3. Item must currently be in 'action_required' state (guards against renewing
 *        an available, hidden, sold, or archived item by mistake).
 */
const renewItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found.',
      });
    }

    // Ownership check — only the actual seller can renew
    const sellerId = typeof item.seller === 'object' ? item.seller._id : item.seller;
    if (sellerId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to renew this listing.',
      });
    }

    // State check — only action_required items can be renewed
    if (item.status !== 'action_required') {
      return res.status(400).json({
        success: false,
        message: `Cannot renew a listing with status '${item.status}'. Only 'action_required' listings can be renewed.`,
      });
    }

    // Reset status and clear the expiry timestamp so the 30-day clock restarts.
    // We use Item.findByIdAndUpdate with $currentDate to bypass Mongoose's
    // immutable-createdAt protection and properly reset the clock.
    const updatedItem = await Item.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: 'available',
          actionRequiredAt: null,
        },
        $currentDate: {
          createdAt: true, // Reset the 30-day clock to now
        },
      },
      { new: true, runValidators: false }
    );

    // Create a persistent notification so the seller has a history record of the renewal.
    try {
      await Notification.create({
        userId: sellerId,
        type: 'renewed',
        message: `Your item "${item.title || 'Untitled'}" has been renewed and is now visible in the marketplace again.`,
        itemTitle: item.title || 'Untitled',
        itemId: item._id,
      });
    } catch (notifErr) {
      console.error('Failed to create renewal notification:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Listing renewed successfully! It is now visible in the marketplace again.',
      data: updatedItem,
    });

  } catch (error) {
    console.error(`Renew Item Error: ${error.message}`);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Listing not found. Invalid ID format.',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while renewing the listing. Please try again.',
    });
  }
};


module.exports = { createItem, getItems, getItemById, updateItem, deleteItem, reportItem, getColleges, renewItem };