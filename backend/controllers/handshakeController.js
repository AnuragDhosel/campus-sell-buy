/**
 * @file controllers/handshakeController.js -> This file contains the Handshake Controller.
 * @description Business logic(The actual work of the application) for the Privacy-First Contact Request system.
 * 
 * In Express projects we usually have
 *       Routes ──► Controllers ──► Models
 *
 * ─── What is a "Handshake"? ──────────────────────────────────────────────────
 *
 *   A Handshake is a FORMAL REQUEST from a buyer to a seller.
 *   Instead of exposing the seller's private details (hostel name, room no, phone no)
 *   to everyone who browses the marketplace, the platform gates(protect) seller's private details
 *   information behind a request → approve/decline workflow.
 *
 *   This is the cornerstone(The most important part) of user trust on the platform. Because 
 *   everyone could see their Phone, Room, Hostel. So this feature builds - Trust
 * 
 *
 * ─── The Complete Flow ───────────────────────────────────────────────────────
 *
 *      Buyer                   Platform                     Seller
 *      ─────                   ────────                     ──────
 *   "I want this laptop"
 *        │
 *        ▼
 *   POST /request ──────► Handshake created ──────► Appears in notifications
 *   (status: 'pending')                              GET /my-notifications
 *                                                         │
 *                                                         ▼
 *                                                    "Do I trust this buyer?"
 *                                                         │
 *                                          ┌──────────────┴──────────────┐
 *                                          ▼                             ▼
 *                                    PUT /respond                  PUT /respond
 *                                  status: 'approved'            status: 'declined'
 *                                  shareHostel: true               (no details shared)
 *                                  shareMobile: false
 *                                          │
 *                                          ▼
 *                                   Buyer can now see
 *                                   hostel & room details
 *                                   (but NOT mobile number
 *                                   because seller chose false)
 *
 * 
 * ─── Security Checks (Defense in Depth) ──────────────────────────────────────
 *
 *   Check 1: Does the item actually exist?
 *     → Prevents handshake requests for deleted or fake items.
 *        - Suppose : Laptop was deleted.
               Buyer somehow sends: POST /request  with old item ID.
               Without checking, backend creates - Handshake
               Now database contains - broken data.
               This is called - Orphan Data
                So first - check item exists.
 *
 *   Check 2: Is the buyer trying to request their own item?
 *     → Sellers should not be able to "request" their own listing.
 *       This would be a meaningless operation and could create ghost data.
 *
 *   Check 3: Has this buyer already requested this item?
 *     → Prevents a buyer from spamming a seller with duplicate requests.
 *       Without this, a buyer could send 100 "pending" requests for the
 *       same item, flooding the seller's notification feed.
 *
 *   Check 4 (in respondToHandshake): Is the responder actually the seller?
 *     → Prevents any random user from approving/declining someone else's handshake by guessing 
 *       the handshake ID.
 *         - Suppose : Buyer knows - Handshake ID : abc123
                      Without authorization Buyer sends : PUT /respond approved
                     Buyer approved his own request. Now he gets Seller's private information.
                   Huge security issue.
                  So always verify : Current User == Seller
 *      
 *
 * ─── Mongoose .populate() Deep Dive ──────────────────────────────────────────
 * 
 * * First, why do we need populate()?
 *    Suppose you have two collections.
 *       User Collection : { _id: "U101", name: "Anurag", email: "anurag@test.com", password: "hashed_password" }
 *       Handshake Collection : { buyerId: ObjectId("U101"), sellerId: ObjectId("U200"), itemId: ObjectId("I500") }
 *         in the handshake collection , we store User ID instead whole user document bcz every handshake would duplicate the same user data, wasting storage and causing inconsistency.
 *         so MongoDB stores only the ObjectId (reference) in Handshake Collection.
 *  
 * * What is an ObjectId?
      Think of it like an Aadhaar number or Student Roll Number.
        Instead of writing : Anurag , CSE , 3rd Year
        we simply write : Student ID = 101
        Later, we can fetch all student details using that ID.
        MongoDB does the same. buyerId: ObjectId("U101")
 
 * * Problem 
      Suppose your frontend receives : { buyerId: "U101" }
        Can the frontend show - Buyer Name : U101
        No. The frontend needs, Buyer Name : Anurag and more user detail
        So just storing the ObjectId is not enough.      
 
 * * Solution → populate()
      .populate("buyerId")
        This tells Mongoose: "Don't give me only the buyer's ID. Go to the User collection and bring the buyer's information."       
 
 * * Without populate()
      Suppose we run : const handshake = await Handshake.find();
        Output : [ { buyerId: "U101", sellerId: "U200", itemId: "I500" } ]
        Only IDs we get.

 * * With populate()
      Suppose we run : const handshake = await Handshake.find().populate("buyerId");
        Now output becomes : [ { 
          buyerId: { _id: "U101", name: "Anurag", email: "anurag@test.com", password: "hashed_password" }
        } ]
      Instead of ID, you now have the complete user document.       

 * * Why do we write .populate("buyerId", "name email") instead of .populate("buyerId")    
        .populate("buyerId") - it gives every info of user including password to the frontend.
        .populate("buyerId", "name email") - it gives only buyerId , name and email

 * * How does populate() work internally?
      Suppose you write : const handshakes = await Handshake.find().populate("buyerId", "name email");
        Step 1 :
          Mongoose first runs : Handshake.find()
          Suppose database returns : [ { buyerId: "U101" }, { buyerId: "U102" }, { buyerId: "U103" } ]
            Only IDs.
        Step 2 :
          Mongoose collects all buyer IDs. U101 , U102 , U103    
        Step 3 :
          Now Mongoose performs another query : User.find({
                                                      _id: { $in: [ "U101", "U102", "U103" ] }
                                                }); 
          means : Find - User U101 OR User U102 OR User U103
          What is $in?
            $in means : Find documents whose value exists inside this array.
        Step 4 :
          Now Mongoose has all the user documents for those IDs.
        Step 5 :
          Finally, Mongoose merges the results back into the original handshake array.
          Now Mongoose has Handshake -> { buyerId: "U101" }
            and User : { _id:"U101", name:"Anurag", email:"anurag@test.com" }
            It replaces 
              buyerId:"U101" with buyerId:{ _id:"U101", name:"Anurag", email:"anurag@test.com" }
          Now the frontend gets useful information.

 * * Is populate() a JOIN?
      Technically, no.
        SQL : JOIN ──► Database combines tables.
        Mongoose :  Query Handshake ──► Collect IDs ──► Query User ──► Merge Results
        The merging is done by Mongoose, not by MongoDB.
        So we often say
          "populate() behaves like a JOIN"
        But internally, it is : Query 1 + Query 2 + Merge  

 */

        
const Handshake = require('../models/Handshake'); // Imports the Handshake Model from the models directory.
const Item      = require('../models/Item');  // Imports the Item Model bcz before creating a handshake we must verify Does the item actually exist?

// ─── Controller: Request Contact ─────────────────────────────────────────────

/** description
 * @controller requestContact  ->  Current function name
 * @route   POST /api/handshakes/request  ->  API Endpoint
 * @access  Private (JWT required) —> only logged-in users can send requests
 * @desc    Creates a new Handshake (contact request) from a buyer to a seller for a specific item.
 */
const requestContact = async (req, res) => {
  try {
    /* ── Extract fields from request body ──────────────────────────────────
    The frontend sends the item they're interested in and the seller who owns it. 
    req.body : { itemId:"123", sellerId:"456" } and store it in variables.
    buyerId is NOT sent by the client — it comes from the JWT via req.user.id.
    This makes the buyer's identity tamper-proof. */
    const { itemId, sellerId } = req.body;

    // ── Input Validation ─────────────────────────────────────────────────
    if (!itemId || !sellerId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both itemId and sellerId.',
      });
    }

/* ── Security Check 1: Does the item actually exist? ──────────────────
    Go to MongoDB and check if the itemId is existing in the items collection or not.
    if item is not found, return underfined
    if item is found, return the full item document. 
    WHY?
      Without this, a buyer could send a handshake request for:
      - A deleted item (item was removed but frontend cache still shows it)
      - A fabricated itemId (malicious user crafting manual API calls)
      Either case would create orphan handshake records pointing to nothing. */
    const item = await Item.findById(itemId);

    if (!item) { // if Item not found in the database
      return res.status(404).json({
        success: false,
        message: 'This item no longer exists.',
      });
    }

/* ── Security Check 2: Self-Request Prevention ────────────────────────
    if (req.user.id === sellerId) Meaning Current logged-in user == Seller
    Suppose : Seller logs in and clicks request Contact on his own item, this Makes no sense.
    WHY?
      A seller requesting their OWN item's contact details makes no sense —
      they already HAVE their own details. Allowing this would:
      - Create meaningless handshake records in the database.
      - Show self-requests in the seller's own notification feed (confusing).
      - Waste database storage and query performance.
    
    .toString() is CRITICAL:
      req.user.id is a string ("6a3c4031...") , req.user.id comes from JWT not from frontend.
      sellerId from req.body is also a string
      Direct comparison with === works for strings. */
    if (req.user.id === sellerId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot request contact details for your own item.',
      });
    }

/* ── Security Check 3: Duplicate Request Prevention ───────────────────
    WHY?
      Without this, a buyer could:
      - Click "Request Contact" 50 times → 50 pending handshakes created.
      - Each one shows up in the seller's notification feed.
      - This is spam and degrades the seller's experience.
    
      We check for ANY existing handshake (pending OR approved) because:
      - 'pending' : A request is already waiting — no need for another.
      - 'approved': The seller already shared details — no need to ask again.
      - 'declined': We ALLOW re-requesting after a decline (seller may change mind).
    
    HOW this query works:
      Handshake.findOne({ buyerId: "buyer123", itemId: "item456", status: { $in: ['pending', 'approved'] } })
    
      $in is a MongoDB operator meaning "match ANY value in this array".
      It's like: status === 'pending' || status === 'approved'
      But written as a single query condition.
    
    PERFORMANCE:
      Our { buyerId: 1, itemId: 1 } index makes this lookup near-instant.
      Without the index, MongoDB would scan every handshake document. */ 
    const existingHandshake = await Handshake.findOne({
      buyerId: req.user.id,
      itemId,
      status: { $in: ['pending', 'approved'] },
    });

    if (existingHandshake) { // If a handshake already exists for this buyer-item pair with status pending or approved
      return res.status(400).json({
        success: false,
        message: 'You already have an active request for this item.',
      });
    }


/* ── Create the Handshake ─────────────────────────────────────────────
    All 3 security checks passed — it's safe to create the record.
    
    buyerId is set from req.user.id (from JWT — tamper-proof).
    status defaults to 'pending' (defined in the schema).
    sharedDetails defaults to { shareHostel: false, shareMobile: false }. */
    const handshake = await Handshake.create({
      buyerId:  req.user.id, // From JWT (tamper-proof) — NOT from req.body
      sellerId,
      itemId,
    });

    // ── Return 201 Created ───────────────────────────────────────────────
    res.status(201).json({
      success: true,
      message: 'Contact request sent successfully! The seller will be notified.',
      data: handshake,
    });

  } catch (error) {
    console.error(`Request Contact Error: ${error.message}`);

    // Handle invalid ObjectId format (e.g., "NOT_A_VALID_ID")
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid item or seller ID format.',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while sending the contact request. Please try again.',
    });
  }
};



// ─── Controller: Get My Notifications ────────────────────────────────────────

/**
 * @controller getMyNotifications -> Controller (function) name.
 * @route   GET /api/handshakes/my-notifications
 * @access  Private (JWT required — sellers check their incoming requests) -> Only logged-in users can access this API.
 * @desc    This API returns : only pending handshake requests and only for the currently logged-in seller
            It also loads buyer : information and item information
            so the frontend can display a complete notification.
 */
const getMyNotifications = async (req, res) => {
  try {

/* ── Query: Find all pending requests addressed to this seller ─────────
    
    sellerId: req.user.id → Only show handshakes where I am the seller -> only the logged-in seller sees their own requests.
    status: 'pending'     → Only show requests that haven't been responded to.
                             (Approved/declined are historical — not notifications.)

    
    Step 1 : We start with
                  const notifications = await Handshake.find({
                      sellerId: req.user.id,
                      status: 'pending'
                  });
          Suppose MongoDB returns : 
                            [
                                {
                                    buyerId: "U101",
                                    itemId: "I201",
                                    status: "pending"
                                },
                                {
                                    buyerId: "U102",
                                    itemId: "I202",
                                    status: "pending"
                                }
                            ]
                Notice :
                    It is an array of handshake documents.
                    Each document only contains IDs.

    Step 2 : Now we write
                  .populate('buyerId', 'name email')
              Mongoose goes through every handshake document and replaces objectID with full buyer's information.
              Now the array becomes
                            [
                                { buyerId: {
                                      _id: "U101",
                                      name: "Anurag",
                                      email: "anurag@test.com"
                                  },
                                  itemId: "I201",
                                  status: "pending"
                                },
                                { buyerId: {
                                      _id: "U102",
                                      name: "Rahul",
                                      email: "rahul@test.com"
                                  },
                                  itemId: "I202",
                                  status: "pending"
                                }
                            ]
              Notice
                  Only buyerId changed.
                  item remains the same.
      
      Step 3 : Now comes
                  .populate('itemId', 'title price images')
              Mongoose goes through the same handshake documents.
              This time it replaces itemId with full item information.
              Now the array becomes 
                            [
                                { buyerId: {
                                      _id: "U101",
                                      name: "Anurag",
                                      email: "anurag@test.com"
                                },
                                  itemId: {
                                      title: "Old Laptop",
                                      price: 5000,
                                      images: ["img1.jpg"]
                                },
                                  status: "pending"
                                }
                            ]
                  Notice
                    Now both fields are populated.

      Step 4 : Now we sort
                    .sort({ createdAt: -1 })
                Newest requests appear first. The seller sees the latest notifications at the top.
                -1 = descending (newest first), 1 = ascending (oldest first).      
    
    PERFORMANCE:
      Our { sellerId: 1, status: 1 } index makes this query blazing fast.
      MongoDB uses the index to jump directly to this seller's pending handshakes
      instead of scanning the entire collection. */
    const notifications = await Handshake.find({
      sellerId: req.user.id, // Only show requests where the logged-in user is the seller
      status: 'pending',    // Only show requests that haven't been responded to yet
    })
      .populate('buyerId', 'name email')      // Buyer's display info
      .populate('itemId', 'title price images') // Item context for the notification
      .sort({ createdAt: -1 });                // Newest first

    // ── Return the notification feed ─────────────────────────────────────
    res.status(200).json({
      success: true,
      count: notifications.length, // e.g., "You have 3 pending requests"
      data: notifications,
    });

  } catch (error) {
    console.error(`Get Notifications Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error while loading notifications. Please try again.',
    });
  }
};



// ─── Controller: Respond to Handshake ────────────────────────────────────────

/**
 * @controller respondToHandshake
 * @route   PUT /api/handshakes/:id/respond
 * @access  Private (JWT required — ONLY the seller can respond)
 * @desc    This API allows the seller to : Approve the request or Decline the request
            If approved, seller also decides : Share Hostel? or Share Mobile? or Both? or None?
 *
 * ─── Granular Privacy: Why shareHostel and shareMobile exist ──────────────────
 *
 *   Instead of a binary "share everything or nothing", the seller has CONTROL:
 *
 *   Scenario 1: "I'll meet them at the hostel gate"
 *     → shareHostel: true,  shareMobile: false
 *     → Buyer sees hostel name + room, but NOT the phone number.
 *
 *   Scenario 2: "I prefer to coordinate via phone"
 *     → shareHostel: false, shareMobile: true
 *     → Buyer sees mobile number, but NOT the hostel location.
 *
 *   Scenario 3: "Share everything for quick handoff"
 *     → shareHostel: true,  shareMobile: true
 *
 *   Scenario 4: "I don't trust this person yet" (decline)
 *     → status: 'declined'
 *     → Both remain false, no details are ever revealed.
 *
 *   This granular approach is a HUGE trust & safety feature for your FYP.
 */
const respondToHandshake = async (req, res) => {
  try {
/* ── Extract response data ────────────────────────────────────────────
    seller sends status, shareHostel, shareMobile in the request body by frontend.
      status: 'approved' or 'declined' — the seller's decision.
      shareHostel, shareMobile -> booleans values */
    const { status, shareHostel, shareMobile, shareRoomNumber, sharePhoneNumber } = req.body;

/* ── Input Validation ─────────────────────────────────────────────────
    !status means Seller didn't send status. Example - {}
    !['approved','declined'].includes(status)
          Suppose seller sends -> { "status":"hello" }
          Now -> ['approved','declined'].includes("hello")
          so, it returns false */
    if (!status || !['approved', 'declined'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid status: "approved" or "declined".',
      });
    }

/* ── Find the Handshake ───────────────────────────────────────────────
    req.params.id comes from the URL parameter :id in /api/handshakes/:id/respond
    Go to MongoDB -> Find Handshake whose _id matches req.params.id */
    const handshake = await Handshake.findById(req.params.id); 

    if (!handshake) {
      return res.status(404).json({
        success: false,
        message: 'Handshake request not found.',
      });
    }

/* ── Authorization Check: Is this actually the seller? ────────────────
    WHY?
      Without this check, ANY logged-in user could approve/decline
      ANY handshake request just by guessing the handshake _id.
    
      Example attack:
         Suppose : 
            - Handshake belongs to user1 and user2 is seller
            - Current logged-in user is user2 who want to see user1's private details
            - suppose : user2 guesses handshake ID of user1 : abc123
            - user2 sends PUT /api/handshakes/abc123/respond { status: "approved" }
            - Now user2 can see user1's private details (hostel, room, mobile)
            - This is a huge security breach.
    
    This check ensures ONLY the seller (the person being asked) can respond(approve/decline).
    
    req.user.id -> user id who want to respond the handshake request (from JWT) to see seller's private details
    handshake.sellerId -> user id of the seller who is being asked for their private details
       
    Why toString()?
         - handshake.sellerId is ObjectId(...)
         - req.user.id is string
         - toString() converts ObjectId to string so we can compare them correctly. 
*/
    if (req.user.id !== handshake.sellerId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this handshake.',
      });
    }

/* ── Check if already responded ───────────────────────────────────────
    Prevent double-responding (e.g., approving an already-declined request).
      Suppose Handshake already Approved, 
      Seller again clicks Approve. 
      Should backend allow it? No. */
    if (handshake.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This handshake has already been ${handshake.status}. Cannot modify.`,
      });
    }

    // ── Update the handshake status ──────────────────────────────────────
    handshake.status = status;

/* ── If approved, set the granular privacy flags ──────────────────────
    These flags are ONLY meaningful when the seller approves.
    If declined, they stay as false (their defaults) — nothing is shared.
    
    handshake.sharedDetails.shareHostel = shareHostel === true;
       Suppose : shareHostel = true;
                  Then shareHostel === true, this becomes true === true, so Result is true
             So finally, handshake.sharedDetails.shareHostel = true;
           MongoDB stores -> sharedDetails: { shareHostel: true }
    same for shareMobile  */
    if (status === 'approved') {
      const roomGranted = shareRoomNumber === true || shareHostel === true;
      const phoneGranted = sharePhoneNumber === true || shareMobile === true;
      handshake.sharedDetails.shareRoomNumber = roomGranted;
      handshake.sharedDetails.shareHostel = roomGranted;
      handshake.sharedDetails.sharePhoneNumber = phoneGranted;
      handshake.sharedDetails.shareMobile = phoneGranted;
    } else {
      handshake.sharedDetails.shareRoomNumber = false;
      handshake.sharedDetails.shareHostel = false;
      handshake.sharedDetails.sharePhoneNumber = false;
      handshake.sharedDetails.shareMobile = false;
    }

    // ── Save to MongoDB ──────────────────────────────────────────────────
    await handshake.save(); // The current changes exist only in RAM; now save them to MongoDB.

    // ── Return the updated handshake ─────────────────────────────────────
    res.status(200).json({
      success: true,
      message: status === 'approved'
        ? 'Request approved! Shared details updated.'
        : 'Request declined. No details were shared.',
      data: handshake,
    });

  } 
  catch (error) {
    console.error(`Respond to Handshake Error: ${error.message}`);

    // Handle invalid ObjectId format in the URL parameter
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Handshake not found. Invalid ID format.',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while responding to the request. Please try again.',
    });
  }
};


// ─── Controller: Get Handshake By ID ─────────────────────────────────────────

/**
 * @controller getHandshakeById
 * @route   GET /api/handshakes/:id
 * @access  Private (JWT required — ONLY buyer or seller involved can view)
 * @desc    Retrieves a handshake by ID. If approved, reveals private contact fields 
 *          (roomNumber, sellerPhoneNumber) strictly based on handshake.sharedDetails permissions.
 */
const getHandshakeById = async (req, res) => {
  try {
    const handshake = await Handshake.findById(req.params.id)
      .populate('buyerId', 'name email')
      .populate('sellerId', 'name email');

    if (!handshake) {
      return res.status(404).json({
        success: false,
        message: 'Handshake not found.',
      });
    }

    const userId = req.user.id.toString();
    const buyerIdStr = (handshake.buyerId?._id || handshake.buyerId).toString();
    const sellerIdStr = (handshake.sellerId?._id || handshake.sellerId).toString();

    const isBuyer = userId === buyerIdStr;
    const isSeller = userId === sellerIdStr;

    // FEATURE 9 & 10: Requester authorization check
    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this handshake information.',
      });
    }

    // Fetch associated item with private fields explicitly selected
    const item = await Item.findById(handshake.itemId).select('+hostelName +roomNumber +sellerPhoneNumber');

    const responseItem = {
      _id: item?._id || handshake.itemId,
      title: item?.title || '',
      price: item?.price || 0,
      category: item?.category || '',
      description: item?.description || '',
      condition: item?.condition || '',
      collegeName: item?.collegeName || '',
      images: item?.images || [],
    };

    const isApproved = handshake.status === 'approved';
    const roomGranted = isApproved && isBuyer && Boolean(handshake.sharedDetails?.shareRoomNumber || handshake.sharedDetails?.shareHostel);
    const phoneGranted = isApproved && isBuyer && Boolean(handshake.sharedDetails?.sharePhoneNumber || handshake.sharedDetails?.shareMobile);

    const contactObj = {};

    // Reveal Hostel Name only when request is approved (regardless of room or phone permissions)
    if (isApproved && (isBuyer || isSeller) && item?.hostelName) {
      contactObj.hostelName = item.hostelName;
      responseItem.hostelName = item.hostelName;
    }

    // FEATURE 6, 7, 8: Private data is ONLY returned when status === 'approved' AND permission is true AND requester is buyer
    if (roomGranted && item?.roomNumber) {
      contactObj.roomNumber = item.roomNumber;
      responseItem.roomNumber = item.roomNumber;
    }

    if (phoneGranted && item?.sellerPhoneNumber) {
      contactObj.phoneNumber = item.sellerPhoneNumber;
      contactObj.sellerPhoneNumber = item.sellerPhoneNumber;
      responseItem.phoneNumber = item.sellerPhoneNumber;
      responseItem.sellerPhoneNumber = item.sellerPhoneNumber;
    }

    const responseData = {
      _id: handshake._id,
      status: handshake.status,
      buyerId: handshake.buyerId,
      sellerId: handshake.sellerId,
      itemId: responseItem,
      sharedDetails: handshake.sharedDetails,
      permissions: {
        shareRoomNumber: Boolean(handshake.sharedDetails?.shareRoomNumber || handshake.sharedDetails?.shareHostel),
        sharePhoneNumber: Boolean(handshake.sharedDetails?.sharePhoneNumber || handshake.sharedDetails?.shareMobile),
      },
      contact: contactObj,
      createdAt: handshake.createdAt,
      updatedAt: handshake.updatedAt,
    };

    res.status(200).json({
      success: true,
      data: responseData,
      handshake: responseData,
    });
  } catch (error) {
    console.error(`Get Handshake By ID Error: ${error.message}`);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Handshake not found. Invalid ID format.',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while fetching handshake.',
    });
  }
};


// ─── Controller: Get My Requests (Buyer View) ───────────────────────────────

/**
 * @controller getMyRequests
 * @route   GET /api/handshakes/my-requests
 * @access  Private (JWT required — buyers check their sent requests)
 * @desc    Returns all contact requests sent by the logged-in buyer, with 
 *          approved private contact fields included ONLY if permitted.
 */
const getMyRequests = async (req, res) => {
  try {
    const handshakes = await Handshake.find({ buyerId: req.user.id })
      .populate('sellerId', 'name email')
      .sort({ createdAt: -1 });

    const formattedRequests = await Promise.all(
      handshakes.map(async (handshake) => {
        const item = await Item.findById(handshake.itemId).select('+hostelName +roomNumber +sellerPhoneNumber');

        const responseItem = {
          _id: item?._id || handshake.itemId,
          title: item?.title || '',
          price: item?.price || 0,
          category: item?.category || '',
          description: item?.description || '',
          condition: item?.condition || '',
          collegeName: item?.collegeName || '',
          images: item?.images || [],
        };

        const isApproved = handshake.status === 'approved';
        const roomGranted = isApproved && Boolean(handshake.sharedDetails?.shareRoomNumber || handshake.sharedDetails?.shareHostel);
        const phoneGranted = isApproved && Boolean(handshake.sharedDetails?.sharePhoneNumber || handshake.sharedDetails?.shareMobile);

        const contactObj = {};

        // Reveal Hostel Name only when approved (regardless of room/phone permission)
        if (isApproved && item?.hostelName) {
          contactObj.hostelName = item.hostelName;
          responseItem.hostelName = item.hostelName;
        }

        if (roomGranted && item?.roomNumber) {
          contactObj.roomNumber = item.roomNumber;
          responseItem.roomNumber = item.roomNumber;
        }

        if (phoneGranted && item?.sellerPhoneNumber) {
          contactObj.phoneNumber = item.sellerPhoneNumber;
          contactObj.sellerPhoneNumber = item.sellerPhoneNumber;
          responseItem.phoneNumber = item.sellerPhoneNumber;
          responseItem.sellerPhoneNumber = item.sellerPhoneNumber;
        }

        return {
          _id: handshake._id,
          status: handshake.status,
          sellerId: handshake.sellerId,
          itemId: responseItem,
          sharedDetails: handshake.sharedDetails,
          permissions: {
            shareRoomNumber: Boolean(handshake.sharedDetails?.shareRoomNumber || handshake.sharedDetails?.shareHostel),
            sharePhoneNumber: Boolean(handshake.sharedDetails?.sharePhoneNumber || handshake.sharedDetails?.shareMobile),
          },
          contact: contactObj,
          createdAt: handshake.createdAt,
          updatedAt: handshake.updatedAt,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: formattedRequests.length,
      data: formattedRequests,
    });
  } catch (error) {
    console.error(`Get My Requests Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error while loading your requests. Please try again.',
    });
  }
};



// ─── Controller: Get Buyer Requests for a Specific Item ──────────────────────

/**
 * @controller getItemRequests
 * @route   GET /api/handshakes/item/:itemId/requests
 * @access  Private (JWT required — ONLY the seller who owns the item can view)
 * @desc    Returns ALL handshakes (pending + approved + declined) for a specific item,
 *          visible only to the seller who owns that item.
 */
const getItemRequests = async (req, res) => {
  try {
    const { itemId } = req.params;

    // Verify the item exists and the requester is its seller
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found.',
      });
    }

    const itemSellerId =
      typeof item.seller === 'object' ? item.seller.toString() : item.seller;
    if (itemSellerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view requests for this item.',
      });
    }

    // Fetch all handshakes for this item
    const handshakes = await Handshake.find({ itemId })
      .populate('buyerId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: handshakes.length,
      data: handshakes,
    });
  } catch (error) {
    console.error(`Get Item Requests Error: ${error.message}`);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Item not found. Invalid ID format.',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while loading buyer requests.',
    });
  }
};


module.exports = {
  requestContact,
  getMyNotifications,
  respondToHandshake,
  getHandshakeById,
  getMyRequests,
  getItemRequests,
};
