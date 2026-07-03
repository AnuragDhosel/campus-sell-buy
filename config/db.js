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
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected Successfully: ${conn.connection.host}`);
  } 
  catch (error) {
    console.error(`MongoDB Connected failed: ${error}`);
}
};

module.exports = connectDB;
