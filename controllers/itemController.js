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

/**
 * The main idea is very simple:
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


    /* ── Step 4: Extract secure URLs from Cloudinary results ───────────────
    Each result object has many fields. We only need `secure_url` —
    because MongoDB doesn't store images. It stores only URLs.
    Finally: ["https://abc.jpg", "https://xyz.jpg", "https://pqr.jpg"]
    Example secure_url:
      "https://res.cloudinary.com/your_cloud/image/upload/v1234/campus_marketplace/items/abc123.jpg" 
    */
    const imageUrls = cloudinaryResults.map((result) => result.secure_url);

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
      images:      imageUrls,       // Array of Cloudinary HTTPS URLs
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