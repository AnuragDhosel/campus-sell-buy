/** 
 @file config/cloudinary.js
 @description Initializes and configures the Cloudinary Node.js SDK. 
              This file prepares the Cloudinary library so that the rest of the application can upload images.
 
  What is Cloudinary?
    * Cloudinary is a cloud-based media management service. 
    * Instead of storing images on your own server, you upload them to Cloudinary.
    * Cloudinary stores the images in the cloud and provides a URL to access them.
    
    * We use it to:
         - Store images permanently, so when the server restarts, the images are still available.
         - After uploading, Cloudinary returns a URL like:
                                          https://res.cloudinary.com/abc/image/upload/v123/laptop.jpg
            You store this URL in MongoDB.
            and When React wants to display the image:
                                            MongoDB
                                              ↓
                                            Image URL
                                              ↓
                                            React
                                              ↓
                            Browser loads image directly from Cloudinary

         - Cloudinary can automatically:
                          Compress images, Resize images, Convert formats (JPEG → WebP), Improve loading speed
            This helps make websites faster.
 
  How this file is used:
      const cloudinary = require('cloudinary').v2; // Import Cloudinary
        - This imports the Cloudinary Node.js SDK into your project.
        - Without this line, Node.js doesn't know what cloudinary is.
      .v2 is the version of the Cloudinary SDK we are using. It provides the latest features and improvements.  
*/

const cloudinary = require('cloudinary').v2; // Import the Cloudinary Node.js SDK

/* cloudinary.config({...})
    - This line configures the Cloudinary SDK.
    - In simple words: "I am telling the Cloudinary library which Cloudinary account it should use."
    - Think of it like logging into your Gmail account.
          Before sending an email, Gmail needs to know:
                                    Who are you? Which account should be used?
    - Similarly, before uploading an image, Cloudinary needs to know:
                                    Which Cloudinary account?
                                    Is this application authorized?
    - it runs only once when the application starts.
*/


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // Your unique cloud identifier -> This is like your username for Cloudinary. It tells Cloudinary which account to use.
  api_key:    process.env.CLOUDINARY_API_KEY,    // Public key (safe to log, not secret) -> This is like a public identifier for your Cloudinary account. It can be shared safely.
  api_secret: process.env.CLOUDINARY_API_SECRET, // Secret key — NEVER expose this -> This is like a password. It should never be shared or logged. It allows full access to your Cloudinary account.
});

module.exports = cloudinary;


/*

Interview Answer (1 Minute)
    * "This file is used to set up Cloudinary in my project. First, I import the Cloudinary library. Then I 
      configure it by providing my Cloudinary account details like cloud_name, api_key, and api_secret. These 
     values are stored in the .env file instead of writing them directly in the code, which keeps sensitive 
    information secure. After the configuration is complete, I export the configured Cloudinary object so other 
   files can use it to upload images without configuring it again. This keeps the code clean, reusable, and more 
  secure."




Complete Flow
        Application Starts
                ↓
        config/cloudinary.js
                ↓
        Read credentials from .env
                ↓
        Connect to Cloudinary
                ↓
        Export configured object
                ↓
        upload.js imports it
                ↓
        User uploads image
                ↓
        Cloudinary stores image
                ↓
        Returns secure URL
                ↓
        MongoDB stores URL
*/