/**
 * @file config/db.js
 * @description Handles the MongoDB database connection using Mongoose.
 * This function is called once at server startup.
 * It uses environment variables for the connection string,
 * keeping credentials out of the source code.
 */

const mongoose = require('mongoose');

/**
 * Connects to MongoDB using the URI from environment variables.
 * On success: logs a confirmation message.
 * On failure: logs the error and exits the process to prevent the server from running in a broken state.
 */
let isConnected = false;

const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState >= 1) {
    return;
  }
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    isConnected = true;
    console.log(`MongoDB Connected Successfully: ${conn.connection.host}`);
  } 
  catch (error) {
    console.error(`MongoDB Connected failed: ${error.message}`);
    if (!process.env.VERCEL) {
      process.exit(1); // Exit process with failure in long-running mode
    }
    throw error;
  }
};

module.exports = connectDB;
