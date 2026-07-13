/**
  @file middleware/upload.js  : This file configures Multer -> Think of Multer as a gatekeeper for uploaded files.
  @description Multer middleware for intercepting multipart/form-data file uploads.
                    
 
  ─── Why "memoryStorage" and NOT "diskStorage"? ───────────────────────────────
 
 * There are two ways Multer can hold a file while processing your request:
    - Option A: diskStorage → saves the file to the server's hard disk first,
            - flow :
                  User Uploads Image → Multer → Save Image on Server Disk → Read Image from Disk → Upload to Cloudinary → Delete Local Image
            - Notice : 
                  Three extra operations : Save , Read , Delete
                  so, This is slower.
         
    - Option B: memoryStorage → holds the file as a raw Buffer in RAM.
            - flow : 
                  User Uploads Image → Multer → RAM (Buffer) → Cloudinary
            - Notice : 
                  No extra operations, so this is faster.
                  No disk, No temporary files, Much faster.
            - You get `req.files`, each with a `.buffer` property containing the file's bytes.
            - You then pipe that buffer DIRECTLY to Cloudinary's upload stream.
            - Why did you choose memoryStorage?
                  Because : Faster, Less code, No temporary files and Perfect when uploading directly to Cloudinary 
            - Downsides: 
                  Large files can exhaust RAM (fine for our 3-image limit with a size cap) bcz of the limited RAM available.
 
  ─── The Upload Flow (Buffer → Stream → Cloudinary) ──────────────────────────
 
            Browser
              ↓
            Express
              ↓
            Multer
              ↓
            Buffer
              ↓
            Cloudinary
              ↓
            MongoDB


Step 1 : Browser sends : multipart/form-data, which containing : Title , Price , Images

Step 2 : Multer intercepts it.
         Meaning : Before controller runs, Multer reads everything.
        - It creates : req.body , for text fields  and 
                       req.files , for image 

Step 3 : Each image becomes : req.files[i].buffer 
      - Example : 
            req.files = [ { buffer:<Buffer...> }, { buffer:<Buffer...> } .. ]

Step 4: The controller converts the Buffer into a Readable Stream using streamifier and pipes it to 
        Cloudinary's upload stream.

Step 5 : Cloudinary stores image and returns secure_url
         MongoDB stores only secure_url, not image.

 */

const multer = require('multer'); // Import Multer to handle multipart/form-data (file uploads)


/* ── Storage Strategy: memoryStorage ──────────────────────────────────────────────────
  uploaded files on ram and store them in memory as Buffer objects.
    Then every image becomes : req.file.buffer or req.files[i].buffer */
const storage = multer.memoryStorage();

/* ── File Filter: checks -> Is the uploaded file really an image? ────────────────────────────────────────────
This function is called by Multer for EVERY file in the upload request.
It acts as a gatekeeper — only letting valid image types through. */
const imageFileFilter = (req, file, callback) => {
  /* `file.mimetype` is set by the browser (e.g. "image/jpeg", "image/png").
  - Suppose someone uploads : 
      - resume.pdf , MIME type : application/pdf , Not allowed -> Rejected.
      - laptop.jpg , MIME type : image/jpeg , Allowed -> Accepted.

  - What is MIME Type?
        - Every uploaded file has a MIME Type.
          Example : image/jpeg, image/png, application/pdf, video/mp4, text/plain
        - Instead of checking : .jpg , 
                     we check : image/jpeg -> because it is more reliable. */
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png']; // Only : JPEG , JPG , PNG are allowed, Everything else Rejected

  if (allowedMimeTypes.includes(file.mimetype)) {
    callback(null, true); // null = no error , true = accept this file
  } 
  else {
    callback(
      new Error('Invalid file type. Only JPEG, JPG, and PNG images are allowed.'),
      false // false = reject this file
    );
  }
};


// ── Multer Instance ───────────────────────────────────────────────────────────
// Here you create, your own Multer object.
const upload = multer({
  storage: storage,         // Where to store? -> Use RAM buffer, not disk
  fileFilter: imageFileFilter, // Which files allowed? -> Reject non-image files at the middleware layer

  // How many? and How big?
  limits: { 
    fileSize: 5 * 1024 * 1024, // How big?  -> 5 * 1024 * 1024 = 5,242,880 bytes = 5 MB 
                            // Each file must be under 5MB. Multer will reject larger files automatically.
    files: 3, // How many? -> 3 files max. 
              // if user uploads: 10 images, Multer immediately throws : LIMIT_FILE_COUNT
  },
});

// ── Export the upload middleware ──────────────────────────────────────────────
// We export the configured `upload` multer instance.
// In the route file, we will call: upload.array('images', 3)
// - 'images'  → the form-data field name the frontend must use for files
// - 3         → maximum number of files accepted (second line of defense)
module.exports = upload; // export the configured Multer instance so it can be used in route files.
