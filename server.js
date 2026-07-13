/**
 * @file server.js
 * @description Main entry point for the Campus Marketplace API.
 * Initializes Express, loads middleware, connects to the database,
 * and starts listening for incoming requests.
 */

// ─── Core Imports ────────────────────────────────────────────────────────────
const express = require('express');
const dotenv  = require('dotenv'); // sothat we can load environment variables from a .env file into process.env
const cors = require('cors');   // Middleware that enables Cross-Origin Resource Sharing (CORS).
/*
===============================================================================
Why is CORS needed?
===============================================================================

Frontend : http://localhost:3000
Backend  : http://localhost:5000

Although both are running on localhost, they use different ports.
Different ports = Different Origins.

Example:

    fetch("http://localhost:5000/api/health")

Since the request is being made from port 3000 to port 5000,
the browser's Same-Origin Policy blocks it by default.

Browser Error:

    Access to fetch at 'http://localhost:5000/api/health'
    from origin 'http://localhost:3000'
    has been blocked by CORS policy.

-------------------------------------------------------------------------------
How app.use(cors()) solves this
-------------------------------------------------------------------------------

app.use(cors());

This middleware adds the necessary HTTP response headers, such as:

    Access-Control-Allow-Origin: *

When the browser receives these headers, it knows that the backend
explicitly allows requests from other origins, so it permits the
frontend to access the response.

===============================================================================
Note:
===============================================================================

Using '*' allows requests from any origin.

For production, it's more secure to allow only your frontend domain:

app.use(cors({
    origin: "https://your-frontend-domain.com"
}));

*/


// ─── Load Environment Variables ───────────────────────────────────────────────
// Must be called BEFORE any code that references process.env
// Loads .env variables into process.env, so they can be accessed anywhere in the application.
dotenv.config();


// ─── Route Imports ───────────────────────────────────────────────────────────
const authRoutes  = require('./routes/auth');
const itemsRoutes = require('./routes/items'); // Day 3: Item listing routes

// ─── Middleware Imports , check authentication ────────────────────────────────
const { protect } = require('./middleware/authMiddleware');


// ─── Database Connection ──────────────────────────────────────────────────────
const connectDB = require('./config/db');

// ─── Connect to MongoDB ───────────────────────────────────────────────────────
connectDB();

// ─── Initialize Express App ───────────────────────────────────────────────────
const app = express();


// ─── Global Middleware ────────────────────────────────────────────────────────

// Enable CORS so the React frontend (on a different port) can talk to this API.
// In production, restrict this to your actual frontend domain.
app.use(cors());  // imports the CORS package.
// cors() creates middleware.
// app.use() registers that middleware for every incoming request.

// ➡️ Converts incoming JSON data into req.body.
app.use(express.json());

// ➡️ Converts incoming HTML form data (application/x-www-form-urlencoded) into req.body.
app.use(express.urlencoded({ extended: false }));


// ─── API Routes ───────────────────────────────────────────────────────────────
// Auth Routes: Signup & Login (public — no token required)
app.use('/api/auth', authRoutes);

// Items Routes: Create listing, browse listings (mixed public/private)
app.use('/api/items', itemsRoutes);

// ─── Protected Test Route ─────────────────────────────────────────────────────
// PURPOSE: Verify that the protect middleware works end-to-end.
// HOW TO TEST:
//   1. Login via POST /api/auth/login to get a token.
//   2. Send GET /api/test-profile with header: Authorization: Bearer <token>
//   3. A valid token returns your user object. An invalid/missing token returns 401.
app.get('/api/test-profile', protect, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'You have accessed a protected route! 🔐',
    user: req.user, // Populated by the protect middleware
  });
});

// ─── Health Check Route ───────────────────────────────────────────────────────
// A simple GET endpoint to verify the server is alive.
// Accessible at: http://localhost:5000/api/health
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Campus Marketplace API is running 🚀',
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
// Catches any request to an undefined route.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// A centralized error handler for any errors passed via next(error).
// This middleware is identified by Express via its 4-argument signature.
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    // Only show stack trace in development mode
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});
