# 🎓 Campus Marketplace (Campus Sell-Buy)

> A full-stack, privacy-first peer-to-peer marketplace designed specifically for college campuses. Students can buy, sell, and discover used textbooks, electronics, hostel essentials, and campus gear with built-in contact privacy, automated listing lifecycle management, and transparent status notifications.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Why I Built This Project](#-why-i-built-this-project)
- [Key Features](#-key-features)
- [How the Application Works](#-how-the-application-works)
- [Tech Stack](#-tech-stack)
- [Project Architecture & Directory Structure](#-project-architecture--directory-structure)
- [Authentication & Security](#-authentication--security)
- [Marketplace & Search Flow](#-marketplace--search-flow)
- [Privacy-First Handshake System](#-privacy-first-handshake-system)
- [Notification & Activity History System](#-notification--activity-history-system)
- [Automated Listing Expiry & Cron Lifecycle](#-automated-listing-expiry--cron-lifecycle)
- [Image Upload & Cloud Storage Pipeline](#-image-upload--cloud-storage-pipeline)
- [Backend API Reference](#-backend-api-reference)
- [Environment Variables](#-environment-variables)
- [How to Run Locally](#-how-to-run-locally)
- [Build & Deployment](#-build--deployment)
- [Key Technical Concepts (Interview Notes)](#-key-technical-concepts-interview-notes)
- [What I Learned](#-what-i-learned)
- [Future Improvements](#-future-improvements)
- [Author & Acknowledgments](#-author--acknowledgments)

---

## 🌟 Overview

College campuses experience high turnover of semester essentials — students finish courses with textbooks they no longer need, graduate and sell hostel appliances, or look for affordable second-hand laptops and bicycles.

**Campus Marketplace** provides a centralized, dedicated platform for college students to trade items within their campus perimeter. Unlike public platforms where personal phone numbers and hostel locations are exposed to anyone on the internet, Campus Marketplace utilizes a **two-step Handshake agreement**: seller contact information is hidden by default and only disclosed when a seller explicitly approves a buyer's request with customizable sharing permissions.

---

## 🎯 Why I Built This Project

1. **Privacy Concerns on Campus**: In typical campus WhatsApp groups or bulletin boards, students post personal phone numbers, hostel names, and room numbers publicly. This frequently leads to unsolicited calls, spam, and privacy violations — particularly for female students in campus hostels.
2. **Irrelevance of Commercial Platforms**: Platforms like OLX, Craigslist, or Facebook Marketplace are not tailored to college life. Transactions are geographically dispersed, pricing doesn't reflect student budgets, and meeting off-campus with strangers carries safety concerns.
3. **Stale & Ghost Listings**: Campus groups often have abandoned listings from students who graduated months or years ago. This platform solves that through an **automated 30-day listing lifecycle** and a **community moderation report threshold**.

---

## ✨ Key Features

### 🔐 User Authentication & Account Security
- **JWT Bearer Token Authentication**: Secure, stateless authentication with tokens stored in client storage and sent via `Authorization: Bearer <token>` headers.
- **Bcrypt Password Hashing**: Passwords are salted and hashed (10 salt rounds) before database persistence.
- **3-Step OTP Password Reset**: Secure password recovery via 6-digit email OTP (hashed with bcrypt, 10-minute validity window) using Nodemailer and HTML email templates.
- **Protected Client Routes**: Client-side route guards prevent unauthenticated access to marketplace tools and redirect logged-in users away from auth pages.

### 🛍️ Marketplace & Search
- **Live Keyword Search**: Instant searching across item titles and descriptions using MongoDB regex matching.
- **Category Filtering**: Filter by Textbooks, Electronics, Hostels & PG Essentials, Fashion, Sports & Fitness, and Other.
- **Dynamic College Filter**: College dropdown options are aggregated in real-time from active listings in the database (`GET /api/items/colleges`).
- **Detailed Product Views**: Multi-image carousel, condition tags (*Like New*, *Good*, *Fair*, *Poor*), college verification, and owner context.

### 🤝 Privacy-First Handshake / Contact Request
- **Hidden Contact Details**: Hostel room numbers and phone numbers are marked `select: false` in the Mongoose schema and never exposed in public queries.
- **Request Contact Workflow**: Buyers click *Request Contact* on product pages to submit an inquiry.
- **Granular Approval Permissions**: When sellers approve a request, a permission modal allows them to decide individually whether to share their phone number, hostel room number, or both.
- **Buyer Request Tracking**: Dedicated *My Requests* dashboard where buyers monitor pending, accepted, and declined requests with approved seller details.

### 🔔 Notifications & Activity History
- **Unified Notification Feed**: Displays incoming contact requests, moderation report warnings, 30-day action requirements, and persistent event logs (renewed, deleted, auto-archived items).
- **ID-Based Read Tracking**: Navbar bell badge counts **only unread notifications** by matching notification IDs against user storage (`cm_read_notif_ids_<userId>`).
- **Persistent History**: Viewing the notifications page marks items as read (badge resets to 0), but retains all notifications in history. New notifications restart the badge counter accurately.
- **Newest-to-Oldest Sorting**: All notifications sort chronologically by timestamp (`createdAt` / `updatedAt`).

### ⏰ Automated 30-Day Listing Lifecycle (Cron Job)
- **30-Day Expiry**: Automated background job flags available items older than 30 days as `action_required`.
- **Public Concealment**: Expired items immediately disappear from public search and marketplace feeds.
- **Seller Action Flow**: Sellers receive an action card with two direct choices:
  - **Renew My Listing**: Restores status to `available`, clears action timestamp, resets the 30-day clock via `$currentDate`, and logs a renewal confirmation in history.
  - **Delete My Listing**: Cleans up Cloudinary assets, deletes handshake records, removes the item from MongoDB, and logs a deletion confirmation in history.
- **7-Day Inaction Archive**: If a seller takes no action within 7 days of notification, the cron automatically transitions the item to `archived` and creates a persistent removal notification.

### 🛡️ Community Moderation & Auto-Hide
- **Report Listing**: Logged-in users can report problematic or fraudulent items with category-based reasons.
- **Duplicate Prevention**: Users cannot report the same item more than once, and sellers cannot report their own items.
- **5-Report Auto-Hide Threshold**: Once an item receives 5 unique reports, its status automatically changes to `hidden`, removing it from the marketplace while informing the seller via progressive notifications.

### 👤 Profile & Help Center
- **Profile Dashboard**: User information overview, account type badge, college details, and dynamic counts for active listings, wishlist items, and requests.
- **Quick Action Links**: Rapid navigation to My Listings, Wishlist, and Notifications.
- **Integrated Help & Support**: Native support modal displaying the platform contact address with a direct 1-click link to compose an email in Gmail.

---

## 🔄 How the Application Works

```
┌──────────────┐         1. Register / Login (JWT)          ┌──────────────┐
│   Student    │ ─────────────────────────────────────────► │    Server    │
│ (Buyer/User) │ ◄───────────────────────────────────────── │  (Node/API)  │
└──────┬───────┘           Token + User Data Returned       └──────┬───────┘
       │                                                           │
       │ 2. Browse Marketplace & Search Items                      │
       ├───────────────────────────────────────────────────────────┤
       │                                                           │
       │ 3. Click "Request Contact" on Listing                     │
       │    (POST /api/handshakes/request)                         │
       ├───────────────────────────────────────────────────────────┤
       │                                                           ▼
       │                                                    ┌──────────────┐
       │                                                    │ Handshake DB │
       │                                                    │ status=pend  │
       │                                                    └──────┬───────┘
       │                                                           │
       │              4. Notification Bell Badge Updates           │
       │ ◄─────────────────────────────────────────────────────────┤
       │                                                           │
┌──────┴───────┐         5. View Notifications Feed         ┌──────┴───────┐
│    Seller    │ ◄───────────────────────────────────────── │    Server    │
│  (Owner)     │ ─────────────────────────────────────────► │  (Handshake) │
└──────┬───────┘    6. Approve (Choose Phone/Room to Share) └──────┬───────┘
       │               or Decline Request                          │
       │                                                           │
       │ 7. Buyer checks "My Requests" / Product Page              │
       │    - Contact details unlocked if Approved                 │
       ▼    - Status displayed as Declined if Rejected             ▼
```

---

## 💻 Tech Stack

### Frontend
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **React** | 19.x | Component-based user interface architecture |
| **Vite** | 8.x | High-performance frontend build tool and dev server |
| **React Router DOM** | 7.x | Client-side declarative routing and route guards |
| **Tailwind CSS** | 4.x | Utility-first responsive design and color tokens |
| **Axios** | 1.x | Promise-based HTTP client with global interceptors |
| **Lucide React** | 1.x | Clean, lightweight SVG iconography |
| **React Hot Toast** | 2.x | Elegant toast notification alerts |

### Backend
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **Node.js** | 18+ / 22.x | Asynchronous JavaScript server runtime |
| **Express.js** | 5.x | RESTful API routing, controllers, and middleware |
| **MongoDB** | 7.x / Atlas | Scalable document-oriented NoSQL database |
| **Mongoose** | 9.x | Schema-driven object modeling and validation |
| **JSON Web Token** | 9.x | Secure bearer token generation and verification |
| **bcryptjs** | 3.x | One-way password and OTP cryptographic hashing |
| **Cloudinary SDK** | 2.x | Cloud image storage, optimization, and asset cleanup |
| **Multer** | 2.x | Multi-part form-data handler with memory storage |
| **streamifier** | 0.1.x | Converts binary RAM buffers to streams for Cloudinary |
| **node-cron** | 4.x | Scheduled daily automated listing lifecycle jobs |
| **Nodemailer** | 9.x | SMTP email transport for OTP password resets |
| **dotenv** | 17.x | Environment variable management |

---

## 🏗️ Project Architecture & Directory Structure

```
project-01/
├── backend/
│   ├── config/
│   │   ├── cloudinary.js          # Cloudinary SDK credentials configuration
│   │   └── db.js                  # Mongoose MongoDB connection wrapper
│   ├── controllers/
│   │   ├── authController.js      # Signup, Login, Me, Logout, 3-step OTP password reset
│   │   ├── handshakeController.js # Contact requests, responses, item requests, notifications feed
│   │   └── itemController.js      # CRUD operations, reporting, renew, colleges list
│   ├── middleware/
│   │   ├── authMiddleware.js      # Bearer token verification and req.user injection
│   │   └── upload.js              # Multer memoryStorage configuration (max 3 files, 5MB limit)
│   ├── models/
│   │   ├── Handshake.js           # Handshake schema (buyerId, sellerId, itemId, permissions)
│   │   ├── Item.js                # Item schema (pricing, images, reports, status, lifecycle)
│   │   ├── Notification.js        # Persistent notification records (deleted, archived, renewed)
│   │   └── User.js                # User schema (credentials, profile, hashed OTP)
│   ├── routes/
│   │   ├── auth.js                # /api/auth routes
│   │   ├── handshakes.js          # /api/handshakes routes
│   │   └── items.js               # /api/items routes
│   ├── templates/
│   │   └── otpEmail.js            # Responsive HTML email template for password reset OTP
│   ├── utils/
│   │   ├── cronJob.js             # node-cron 30-day expiry and 7-day auto-archive jobs
│   │   └── sendEmail.js           # Nodemailer transport handler
│   ├── package.json               # Backend dependencies and run scripts
│   └── server.js                  # Express app entry point, middleware, routes mounting
│
└── frontend/
    ├── public/
    │   ├── favicon.png            # Main website favicon
    │   ├── favicon.svg            # Fallback SVG icon
    │   └── icons.svg              # SVG sprite assets
    ├── src/
    │   ├── assets/                # Static images and icons
    │   ├── components/
    │   │   ├── Navbar.jsx         # Sticky navigation with unread badge counter & profile menu
    │   │   └── ui/                # Reusable presentation components
    │   │       ├── EmptyState.jsx             # Clean empty-state illustrations
    │   │       ├── ImageCarousel.jsx          # Responsive multi-image listing viewer
    │   │       ├── MyListingCard.jsx          # Seller listing card with action buttons
    │   │       ├── MyListingCardSkeleton.jsx  # Loading state skeleton
    │   │       ├── NotificationCard.jsx       # Action cards (expiry, contact, report, history)
    │   │       ├── NotificationCardSkeleton.jsx
    │   │       ├── ProductCard.jsx            # Marketplace catalog item card
    │   │       ├── ProductCardSkeleton.jsx
    │   │       ├── ReportModal.jsx            # User community reporting dialog
    │   │       └── SharePermissionModal.jsx   # Contact detail disclosure checkboxes
    │   ├── context/
    │   │   ├── AuthContext.jsx    # Global user session, token decoding, login/logout state
    │   │   └── WishlistContext.jsx# Client-side wishlist state with localStorage persistence
    │   ├── pages/
    │   │   ├── EditItem.jsx       # Update existing listing details
    │   │   ├── ForgotPassword.jsx # Step 1 & 2: Request OTP and verify OTP
    │   │   ├── Landing.jsx        # Public welcome and feature preview page
    │   │   ├── Login.jsx          # User login form
    │   │   ├── Marketplace.jsx    # Catalog browse, keyword search, college & category filters
    │   │   ├── MyListings.jsx     # Seller's active listings + buyer requests modal
    │   │   ├── MyRequests.jsx     # Buyer's outgoing contact requests and unlocked contacts
    │   │   ├── Notifications.jsx  # Seller's unified notifications and action hub
    │   │   ├── ProductDetails.jsx # Detailed listing view, image carousel, contact request action
    │   │   ├── Profile.jsx        # Account details, statistics, and Help & Support modal
    │   │   ├── ResetPassword.jsx  # Step 3: Enter new password with resetToken
    │   │   ├── SellItem.jsx       # Multi-field listing creator with image upload
    │   │   └── Wishlist.jsx       # Saved bookmark items gallery
    │   ├── routes/
    │   │   ├── ProtectedRoute.jsx # Guard requiring valid user session
    │   │   └── PublicRoute.jsx    # Guard redirecting logged-in users to /home
    │   ├── utils/
    │   │   └── api.js             # Pre-configured Axios instance with auth interceptor
    │   ├── App.jsx                # Route declarations and toaster setup
    │   ├── index.css              # Tailwind CSS configuration and theme design tokens
    │   └── main.jsx               # React DOM root mounting
    ├── index.html                 # HTML entry point with favicon.png link
    ├── package.json               # Frontend dependencies and Vite build scripts
    └── vite.config.js             # Vite configuration with Tailwind CSS plugin
```

---

## 🔒 Authentication & Security

1. **Password Encryption**: Handled using `bcryptjs`. During registration, the raw password is automatically hashed before being saved to the database.
2. **Stateless JWT**: Upon successful login, the server issues a JSON Web Token signed with a secret key (`JWT_SECRET`) and a 7-day expiration (`JWT_EXPIRE`). The client stores this in `localStorage` and includes it in the `Authorization: Bearer <token>` header for all authenticated requests.
3. **Database Field Hiding (`select: false`)**: Sensitive fields in Mongoose models are explicitly configured with `select: false`:
   - `User.password`
   - `User.resetPasswordOtp`
   - `User.resetPasswordToken`
   - `Item.roomNumber`
   - `Item.sellerPhoneNumber`
   This prevents accidental data leaks during standard `find()` queries.
4. **Secure 3-Step Password Reset**:
   - **Step 1 (`POST /api/auth/forgot-password`)**: User submits email. Server generates a cryptographically secure 6-digit OTP, hashes it with `bcryptjs`, saves it with a 10-minute expiry, and emails the OTP via Nodemailer.
   - **Step 2 (`POST /api/auth/verify-otp`)**: User submits email and 6-digit OTP. Server verifies the OTP hash and returns a short-lived `resetToken`.
   - **Step 3 (`POST /api/auth/reset-password`)**: User submits the `resetToken` and new password. Server verifies the token, hashes the new password, and clears reset fields.
5. **Backend Ownership Enforcement**: Critical operations (updating listings, deleting listings, renewing listings, and responding to handshakes) verify ownership on the server side using `req.user.id` extracted from the decoded JWT. The server rejects unauthorized access with `403 Forbidden`.

---

## 🛒 Marketplace & Search Flow

The marketplace search engine combines three layers of server-side filtering:

1. **Full-Text Keyword Search**:
   ```javascript
   if (keyword) {
     filter.$or = [
       { title: { $regex: keyword, $options: 'i' } },
       { description: { $regex: keyword, $options: 'i' } }
     ];
   }
   ```
2. **Category Filtering**: Direct query filtering against predefined categories (`category = req.query.category`).
3. **Dynamic College Filtering**:
   - The backend exposes `GET /api/items/colleges` which uses MongoDB's aggregation pipeline to find all distinct college names that currently have active, available listings:
   ```javascript
   const colleges = await Item.aggregate([
     { $match: { status: 'available' } },
     { $group: { _id: '$collegeName', count: { $sum: 1 } } },
     { $sort: { _id: 1 } }
   ]);
   ```
   - This ensures the frontend college filter dropdown never displays colleges with 0 items.

---

## 🤝 Privacy-First Handshake System

The core privacy innovation of Campus Marketplace is the **Handshake Protocol**:

```
Buyer clicks "Request Contact"
             │
             ▼
POST /api/handshakes/request  ──► Checks:
                                   • User is not buying own item
                                   • No duplicate pending request exists
             │
             ▼
Handshake record created (status: "pending")
             │
             ▼
Seller sees incoming card in /notifications
             │
     ┌───────┴───────┐
     ▼               ▼
[Decline]         [Accept]
     │               │
     │               ▼
     │        Seller sees SharePermissionModal:
     │        [✓] Share Room Number
     │        [✓] Share Phone Number
     │               │
     ▼               ▼
PUT /api/handshakes/:id/respond
     │
     ▼
Buyer's /my-requests and /item/:id unlock:
"Room: B-204 | Phone: 9876543210"
```

---

## 🔔 Notification & Activity History System

### Unified Notification Types
The `/notifications` page serves as an activity history feed by combining:
1. **Pending Handshakes**: Incoming buyer requests awaiting seller response.
2. **Moderation Warnings**: Alerts when buyers report an item, indicating how many reports remain before automatic hiding.
3. **Action Required (Expiry)**: Notice that an item has hit 30 days and requires renewal or deletion.
4. **Persistent History Records**:
   - `type: 'renewed'`: Record created when seller clicks *Renew My Listing*.
   - `type: 'deleted'`: Record created when an item is deleted.
   - `type: 'archived'`: Record created when an item is auto-archived after 7 days of inactivity.

### Unread Badge Counting
- Stored per user in the client via key `cm_read_notif_ids_<userId>` containing an array of seen notification IDs.
- The Navbar counts items in the feed whose `_id` does not exist in the read set.
- Visiting `/notifications` automatically registers all visible IDs into the read set and clears the badge to 0.
- All notifications remain permanently visible in the list as history.

---

## ⏰ Automated Listing Expiry & Cron Lifecycle

Background maintenance runs through `backend/utils/cronJob.js` initialized on server startup:

```
[Available Item Created]
          │
          │  30 Days Inactive (createdAt <= 30 days ago)
          ▼
Step 1: Cron marks status = 'action_required'
        Sets actionRequiredAt = new Date()
        Item disappears from public marketplace
        Seller receives notification with [Renew] and [Delete] buttons
          │
          ├─────────────────────────────┬─────────────────────────────┐
          │ Seller clicks [Renew]       │ Seller clicks [Delete]      │ 7 Days Pass with No Action
          ▼                             ▼                             ▼
Status -> 'available'           Item deleted from DB          Step 2: Cron marks status = 'archived'
createdAt reset to now          Images removed from Cloud     Creates persistent removal notification
actionRequiredAt cleared        Handshakes removed            Item remains in seller's My Listings
History record created          History record created        Public cannot see or request item
```

---

## 📸 Image Upload & Cloud Storage Pipeline

```
[Client (React)] ── Form with up to 3 images (max 5MB each)
       │
       ▼
[Express Router] ── multer.memoryStorage()
       │            (Stores files in RAM as binary Buffers, no disk writes)
       ▼
[Controller]     ── streamifier.createReadStream(buffer)
       │            (Converts Buffer into a readable stream)
       ▼
[Cloudinary SDK] ── cloudinary.uploader.upload_stream({ folder: 'campus-marketplace' })
       │            (Pipes stream directly to Cloudinary CDN)
       ▼
[MongoDB Item]   ── Saved with array of:
                    { url: "https://res.cloudinary.com/...", publicId: "..." }
```

When a listing is deleted, `itemController.js` calls `cloudinary.uploader.destroy(img.publicId)` for every associated image to avoid orphaned cloud assets.

---

## 📡 Backend API Reference

### 🔑 Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Public | Register student account with hashed password |
| `POST` | `/api/auth/login` | Public | Authenticate user and return JWT bearer token |
| `GET` | `/api/auth/me` | Private | Fetch logged-in user profile details |
| `POST` | `/api/auth/logout` | Private | Acknowledge logout session termination |
| `POST` | `/api/auth/forgot-password` | Public | Step 1: Send 6-digit reset OTP to student email |
| `POST` | `/api/auth/verify-otp` | Public | Step 2: Verify 6-digit OTP and return reset token |
| `POST` | `/api/auth/reset-password` | Public | Step 3: Set new password using reset token |

### 📦 Marketplace Items (`/api/items`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/items` | Private | Create new listing with up to 3 images |
| `GET` | `/api/items` | Public | Search and browse available listings with filters |
| `GET` | `/api/items/colleges` | Public | Get distinct colleges that have active listings |
| `GET` | `/api/items/:id` | Public | Fetch item details (private fields returned to owner only) |
| `PUT` | `/api/items/:id/renew` | Private | Renew expired 30-day listing back to available |
| `PUT` | `/api/items/:id` | Private | Update listing details (verified owner only) |
| `DELETE` | `/api/items/:id` | Private | Delete listing, clean Cloudinary images and handshakes |
| `PUT` | `/api/items/:id/report` | Private | Report listing (auto-hides at 5 unique reports) |

### 🤝 Handshakes & Contact Requests (`/api/handshakes`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/handshakes/request` | Private | Buyer submits contact request for an item |
| `GET` | `/api/handshakes/my-notifications` | Private | Seller fetches notifications (requests, reports, expiry, history) |
| `GET` | `/api/handshakes/my-requests` | Private | Buyer views outgoing contact requests and approval status |
| `GET` | `/api/handshakes/item/:itemId/requests` | Private | Seller views all requests received for a specific item |
| `GET` | `/api/handshakes/:id` | Private | Fetch single handshake record |
| `PUT` | `/api/handshakes/:id/respond` | Private | Seller approves (with permissions) or declines request |

---

## 🔐 Environment Variables

Create a `.env` file in the `backend/` directory based on the following template. **Never commit your `.env` file to version control.**

```env
# ===================================================
# Backend Environment Configuration (.env)
# ===================================================

# Server Port
PORT=5000

# Node Environment ('development' or 'production')
NODE_ENV=development

# MongoDB Connection String
# Local: mongodb://127.0.0.1:27017/campus-marketplace
# Cloud: mongodb+srv://<user>:<password>@cluster.mongodb.net/campus-marketplace
MONGO_URI=mongodb://127.0.0.1:27017/campus-marketplace

# JWT Secret & Expiration
JWT_SECRET=your_super_secret_jwt_key_replace_with_secure_random_string
JWT_EXPIRE=7d

# Frontend Base URL (used for CORS and email links)
FRONTEND_URL=http://localhost:5173

# Cloudinary Cloud Image Storage
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# SMTP Email Configuration (Nodemailer - Gmail or custom SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_character_app_password
MAIL_FROM="Campus Marketplace" <your_email@gmail.com>
```

---

## 🚀 How to Run Locally

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **MongoDB** installed locally or an active **MongoDB Atlas** cluster connection URI
- Free **Cloudinary** account for image hosting

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/campus-sell-buy.git
cd campus-sell-buy
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment configuration file
cp .env.example .env  # or manually create .env and fill values

# Start the backend server in development mode (with nodemon)
npm run dev

# Or start in standard production mode
npm start
```
*Backend runs on: `http://localhost:5000`*

### 3. Frontend Setup
```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
*Frontend runs on: `http://localhost:5173`*

---

## 📦 Build & Deployment

### Production Build
```bash
# Inside frontend/
npm run build
```
Vite outputs the optimized production assets to `frontend/dist/`.

### Deployment Architecture
- **Frontend**: Can be deployed to **Vercel**, **Netlify**, or **Cloudflare Pages** by setting the root directory to `frontend`, build command to `npm run build`, and output directory to `dist`.
- **Backend**: Can be deployed to **Render**, **Railway**, or **AWS EC2** by setting the root directory to `backend` and start command to `node server.js`.
- **Database**: Hosted on **MongoDB Atlas**.
- **Images**: Hosted on **Cloudinary CDN**.

---

## 🧠 Key Technical Concepts (Interview Notes)

If asked about this project in a technical interview, here are the key architectural decisions to highlight:

1. **Why JWT in localStorage vs HttpOnly Cookie?**
   - Implemented as a Bearer token in headers to maintain a fully decoupled, RESTful backend that is easily adaptable to mobile clients or multi-domain frontends.
2. **Why Memory Storage in Multer instead of Disk Storage?**
   - Serverless and containerized deployment platforms (such as Render or Heroku) have ephemeral filesystems. Storing uploaded images temporarily on disk causes crashes or lost files. Buffering in RAM and piping to Cloudinary via `streamifier` eliminates disk writes entirely.
3. **Mongoose `select: false` Defense-in-Depth**:
   - Rather than relying on frontend filtering or manual controller object manipulation to hide phone numbers and room numbers, the privacy contract is enforced at the database model schema level.
4. **Synthetic vs Persistent Notifications**:
   - Active alerts (such as pending requests or items needing action) are dynamically queried from live database state so they automatically reflect changes. Historical events whose originating documents are deleted (like item deletion records) are captured via a dedicated `Notification` model to maintain permanent activity logs without leaving ghost documents.
5. **Atomic Clock Reset with `$currentDate`**:
   - In Mongoose, `createdAt` is typically protected by timestamp automation. To renew a listing and reset its 30-day clock, the renew controller utilizes MongoDB's native `$currentDate: { createdAt: true }` operator inside `findByIdAndUpdate` with `runValidators: false`.

---

## 📚 What I Learned

- Designing and building a full-stack REST API from ground up with clean controller-service-route separation.
- Managing multi-part binary file streaming directly from Express memory to a cloud media CDN.
- Implementing dual-layer security with password salting, JWT verification middleware, and granular field authorization.
- Structuring resilient scheduled background cron workers that manage data lifecycles cleanly without generating duplicate alerts.
- Coordinating global client state with React Context API, custom hooks, and synchronizing unread UI badges with browser local storage.

---

## 🔮 Future Improvements

Features planned for subsequent iterations:
- [ ] **Real-Time In-App Chat**: Integrating Socket.io for direct real-time messaging between verified buyers and sellers once a handshake is approved.
- [ ] **Campus Email Domain Verification**: Restricting signup to institutional `.edu` or `.ac.in` university email addresses.
- [ ] **Google OAuth 2.0**: One-tap sign-in with student Google Workspace accounts.
- [ ] **Push Notifications**: Web push notifications for incoming contact requests when the browser tab is closed.
- [ ] **Automated Image Moderation**: Cloudinary AI content moderation add-on to screen inappropriate image uploads automatically.

---

## 👨‍💻 Author & Acknowledgments

- **Developer**: Anurag Dhosel
- **Project**: Campus Marketplace (Campus Sell-Buy)
- **Repository**: [github.com/AnuragDhosel/campus-sell-buy](https://github.com/AnuragDhosel/campus-sell-buy)
