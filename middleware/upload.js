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
const path = require('path');  // path is a built-in Node.js module. It helps us work with file paths.

/* ── Storage Strategy: memoryStorage ──────────────────────────────────────────────────
  uploaded files on ram and store them in memory as Buffer objects.
    Then every image becomes : req.file.buffer or req.files[i].buffer */
const storage = multer.memoryStorage();



/* ── File Filter: checks -> Is the uploaded file really an image? ────────────────────────────────────────────
This function is called by Multer for EVERY file in the upload request.
It acts as a gatekeeper — only letting valid image types through. 
    User uploads file
            ↓
    imageFileFilter()
            │
            ├── File is valid ─────► callback(null, true)
            │
            └── File is invalid ───► callback(Error, false)

    req -> Contains -> headers , body , user etc.
    file -> This contains information about the uploaded file.
    callback -> This tells Multer what to do.
*/
const imageFileFilter = (req, file, callback) => {

/* ── allowedMimeTypes ─────────────────────────────────────────────────────────── 
*  1. What is MIME?
      - MIME stands for: Multipurpose Internet Mail Extensions
      - In simple words: MIME type tells the server what kind of data/file it received.
      - When you upload a file, the browser/Postman sends some information along with the file.
                  like -> Content-Type: image/png or Content-Type: application/pdf
                  The server reads this information through - file.mimetype
          - Example: photo.png
          - The file information looks like: { originalname: "photo.png", mimetype: "image/png" }
              - Here: mimetype: "image/png" is the MIME type.
              - It tells:
                    "Hey server, this file is an image and its format is PNG."
      - Common MIME examples
            File	         MIME Type            Allowed
          photo.png	      image/png               ✅
          photo.jpg	      image/jpeg              ✅
          document.pdf	  application/pdf         ❌
          video.mp4	      video/mp4               ❌
          text.txt	      text/plain              ❌
          zip file	      application/zip         ❌

    Why check MIME type?
      Suppose someone uploads -> resume.pdf
      The browser sends -> application/pdf
      Our whitelist doesn't contain it.
      So, allowedMimeTypes.includes(file.mimetype) returns false
*/
  const allowedMimeTypes = [ 'image/jpeg', 'image/jpg', 'image/png' ];  // used to check if the uploaded file's MIME type is in the allowed list. If not, the upload is rejected.

/* ── allowedExtensions ───────────────────────────────────────────────────────────  
  This array contains the allowed file extensions. 
  It is used to verify that the uploaded file's filename ends with one of these extensions.
  For example:
      | Uploaded File | Extension | Allowed?   |
      | ------------- | --------- | ---------- |
      | photo.jpg     | `.jpg`    | ✅        |
      | selfie.jpeg   | `.jpeg`   | ✅        |
      | image.png     | `.png`    | ✅        |
      | resume.pdf    | `.pdf`    | ❌        |
      | video.mp4     | `.mp4`    | ❌        |

  1. MIME Type and Extension are different
    - MIME Type :
        Sent by the client (browser/Postman) in the upload request.
        Stored in: file.mimetype
    - Extension :
        Comes from the filename.
        Stored in: file.originalname
*/  
  const allowedExtensions = ['.jpg', '.jpeg', '.png' ]; // used to check if the uploaded file's extension is in the allowed list. If not, the upload is rejected.
 
/* ── extension ───────────────────────────────────────────────────────────  
  Suppose -> Holiday.PNG
  path.extname() returns  -> .PNG
  Then .toLowerCase() makes it -> .png
  now , we check it.
*/  
  const extension = path.extname(file.originalname).toLowerCase(); // return the extension of the uploaded file in lowercase. Example: .jpg, .png, .jpeg

  const isMimeValid = allowedMimeTypes.includes(file.mimetype);  // file.mimetype return mimetype and it check allowedMimeType contain that type or not
  const isExtensionValid = allowedExtensions.includes(extension); // allowedExtensions contain that extension which user send or not

/* ── Why both? ───────────────────────────────────────────────────────────  
  suppose user want to upload virus.exe and he rename it to virus.jpg and send it.
  Extension becomes .jpg
  which looks valid.
  But MIME becomes application/x-msdownload
  So Extension ✔ MIME ✖ => Rejected.
*/
  if (isMimeValid && isExtensionValid) {
    return callback(null, true);
  }

/* ── exception ───────────────────────────────────────────────────────────     
* What is application/octet-stream?
    - It means Generic binary data.
    - The client is basically saying
        "I don't know what this file actually is."

* Why does this happen?
    - Browsers usually send : image/png
    - But tools like : Postman , curl , some mobile apps , poorly configured clients
      sometimes send 'application/octet-stream'
    - even when the file is actually a PNG.
    - Example : photo.png
          comes as file.mimetype -> application/octet-stream
    - If we only checked MIME, we would have rejected which would reject a perfectly valid image.
      So we added this exception.
  */
  if (file.mimetype === 'application/octet-stream' && isExtensionValid) {
    return callback(null, true);
  }

/* If neither condition succeeds, the upload is rejected.
    Multer stops processing. Express receives the error.
    The API returns something like
      { "success": false, "message": "Invalid file type" }
*/  
  callback(
    new Error( 'Invalid file type. Only JPEG, JPG, and PNG images are allowed.' ),
    false
  );
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
