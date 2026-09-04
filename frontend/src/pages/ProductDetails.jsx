/**
 * @file pages/ProductDetails.jsx
 * @description Full product details page for a single marketplace listing.
 *
 * Day 4 Features Implemented:
 *  - Task 1  : Fetch item via GET /api/items/:id (single item, not all-items filter)
 *  - Task 2  : Image carousel (via ImageCarousel component)
 *  - Task 3  : Product info layout (title, price, category, condition, college, description, seller)
 *  - Task 4  : Request Contact — POST /api/handshakes/request with { itemId, sellerId }
 *  - Task 5  : Duplicate request prevention (backend enforced, handled gracefully)
 *  - Task 6-7: Report Item — 3-dot menu + ReportModal confirmation
 *  - Task 8  : Report API — POST /api/items/:id/report
 *  - Task 9  : Wishlist toggle (local state, consistent with marketplace card)
 *  - Task 10 : Sold/archived/hidden status — disables Request Contact
 *  - Task 11 : Skeleton loading state
 *  - Task 12 : 404 Not Found state
 *  - Task 13 : Server error state with retry
 *  - Task 14 : Navigation — back button, marketplace links
 *  - Task 15 : Authentication — seller guard, own-item guard
 *
 * API Contracts (verified from backend source):
 *  GET  /api/items/:id
 *    Response: { success: true, data: { _id, title, description, price, category,
 *                condition, images: [{url, publicId}], status, seller: {_id, name},
 *                collegeName, hostelName, roomNumber, createdAt } }
 *
 *  POST /api/handshakes/request
 *    Body:     { itemId, sellerId }          ← BOTH required by backend
 *    Response: { success: true, message: '...', data: handshake }
 *    400 duplicate: message contains "already have an active request"
 *    400 own item:  message contains "your own item"
 *
 *  POST /api/items/:id/report
 *    Body:     (none — user derived from JWT)
 *    Response: { success: true, message: '...' }
 *    400 dup:  message contains "already reported"
 *
 * Item Status Enum (from backend models/Item.js):
 *   'active' | 'sold' | 'archived' | 'hidden' | 'action_required'
 *   Only 'active' allows Request Contact.
 */

import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Heart,
  MapPin,
  Calendar,
  MoreVertical,
  Flag,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Package,
  Tag,
  Phone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import ImageCarousel from '../components/ui/ImageCarousel';
import ReportModal from '../components/ui/ReportModal';
import EmptyState from '../components/ui/EmptyState';
import { AuthContext } from '../context/AuthContext';
import { WishlistContext } from '../context/WishlistContext';

// ─── Helper: Condition Badge Colors ──────────────────────────────────────────
const conditionStyles = {
  'New':      'bg-[#2F6B4F]/10 text-[#2F6B4F]',
  'Like New': 'bg-[#84A98C]/10 text-[#84A98C]',
  'Good':     'bg-blue-50 text-blue-600',
  'Fair':     'bg-[#D97757]/10 text-[#D97757]',
  'Poor':     'bg-red-50 text-red-500',
};

// ─── Helper: Status Banner ────────────────────────────────────────────────────
// 'available' is the normal active state — no banner shown.
const statusBanner = {
  sold:            { label: 'Sold Out',       bg: 'bg-[#64748B]/10', text: 'text-[#64748B]' },
  archived:        { label: 'Unavailable',    bg: 'bg-[#64748B]/10', text: 'text-[#64748B]' },
  hidden:          { label: 'Under Review',   bg: 'bg-[#D97757]/10', text: 'text-[#D97757]' },
  action_required: { label: 'Action Required',bg: 'bg-[#D97757]/10', text: 'text-[#D97757]' },
};

// ─── ProductDetails Page ──────────────────────────────────────────────────────
const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { isInWishlist, toggleWishlist } = useContext(WishlistContext);

  // Data
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // null | 'not_found' | 'server_error'

  // Contact Request States: null | 'requesting' | 'pending' | 'approved' | 'declined'
  const [contactStatus, setContactStatus] = useState(null);
  // Shared contact info (only populated when status === 'approved')
  const [sharedInfo, setSharedInfo] = useState(null);

  // Report
  const [showReportModal, setShowReportModal] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [hasReported, setHasReported] = useState(false);

  // 3-dot context menu
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // ── Fetch Item ─────────────────────────────────────────────────────────────
  // Uses GET /api/items/:id — single item endpoint (not all-items filter).
  const fetchItem = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/items/${id}`);
      const data = response.data?.data;
      if (!data) {
        setError('not_found');
      } else {
        setItem(data);
        if (user && Array.isArray(data.reports)) {
          const currentUserId = String(user.id || user._id);
          const alreadyReported = data.reports.some(
            (r) => String(r?._id || r) === currentUserId
          );
          if (alreadyReported) {
            setHasReported(true);
          }
        }
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError('not_found');
      } else {
        setError('server_error');
      }
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  // Sync reported status whenever item or user updates
  useEffect(() => {
    if (item && user && Array.isArray(item.reports)) {
      const currentUserId = String(user.id || user._id);
      const isReported = item.reports.some(
        (r) => String(r?._id || r) === currentUserId
      );
      if (isReported) {
        setHasReported(true);
      }
    }
  }, [item, user]);

  useEffect(() => {
    if (id) fetchItem();
  }, [id, fetchItem]);

  // ── Sync Handshake Status on Load ──────────────────────────────────────────
  useEffect(() => {
    if (!id || !user) return;
    const checkHandshakeStatus = async () => {
      try {
        const response = await api.get('/api/handshakes/my-requests');
        const myRequests = response.data?.data || [];
        const match = myRequests.find((req) => {
          const reqItemId = req.itemId?._id || req.itemId;
          return String(reqItemId) === String(id);
        });

        if (match) {
          setContactStatus(match.status);
          if (match.status === 'approved') {
            setSharedInfo(match.contact || match.itemId || match);
          }
        }
      } catch (err) {
        console.error('Failed to sync handshake status:', err);
      }
    };

    checkHandshakeStatus();
  }, [id, user]);

  // ── Close menu on outside click ────────────────────────────────────────────
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // ── Derived Flags ──────────────────────────────────────────────────────────
  const isOwnItem = (() => {
    if (!user || !item) return false;
    // seller may be populated object {_id, name} or plain ObjectId string
    const sellerId = typeof item.seller === 'object' ? item.seller?._id : item.seller;
    return String(sellerId) === String(user.id);
  })();

  // Item is purchasable only when status is exactly 'available'
  // Backend enum: 'available' | 'sold' | 'archived' | 'hidden' | 'action_required'
  const isActive = item?.status === 'available';

  // Derived: is this item in the wishlist?
  const isWishlisted = item ? isInWishlist(item._id) : false;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleWishlist = () => {
    if (!item) return;
    const added = toggleWishlist(item);
    toast(added ? 'Added to wishlist' : 'Removed from wishlist', {
      icon: added ? '❤️' : '💔',
    });
  };

  /**
   * Request Contact
   * Backend expects: POST /api/handshakes/request — body: { itemId, sellerId }
   * Both fields are REQUIRED (verified from handshakeController.js).
   * buyerId is derived server-side from JWT — do NOT send it.
   */
  const handleRequestContact = async () => {
    if (contactStatus || !item) return;

    // Extract sellerId from populated seller object or raw ID
    const sellerId =
      typeof item.seller === 'object' ? item.seller?._id : item.seller;

    setContactStatus('requesting');
    try {
      await api.post('/api/handshakes/request', {
        itemId: item._id,
        sellerId: String(sellerId),   // Both fields required by backend
      });
      setContactStatus('pending');
      toast.success('Contact request sent! The seller will be notified.');
    } catch (err) {
      const msg = err.response?.data?.message || '';
      if (msg.toLowerCase().includes('already have an active request')) {
        // Duplicate — treat as pending gracefully
        setContactStatus('pending');
        toast('You already have a pending request for this item.', { icon: 'ℹ️' });
      } else if (msg.toLowerCase().includes('your own item')) {
        setContactStatus(null);
        toast.error('You cannot request contact for your own item.');
      } else {
        setContactStatus(null);
        toast.error(msg || 'Unable to send request. Please try again.');
      }
    }
  };

  /**
   * Report Item
   * Backend: POST /api/items/:id/report  (NOT PUT)
   * No request body needed — user derived from JWT.
   * Backend handles 5-report hidden threshold internally.
   */
  const handleReport = async () => {
    if (isReporting || !item) return;

    if (hasReported) {
      setShowReportModal(false);
      toast('You have already reported this item.', { icon: 'ℹ️' });
      return;
    }

    setIsReporting(true);
    try {
      const response = await api.put(`/api/items/${item._id}/report`);
      setShowReportModal(false);

      if (response.data?.alreadyReported) {
        setHasReported(true);
        toast('You have already reported this item.', { icon: 'ℹ️' });
        return;
      }

      if (response.data?.isOwnItem) {
        toast.error('You cannot report your own item.');
        return;
      }

      setHasReported(true);
      toast.success(response.data?.message || 'Item reported successfully. Thank you!');
      // If backend auto-hid the item, reflect that locally
      if (response.data?.itemStatus === 'hidden' || response.data?.wasAutoHidden) {
        setItem((prev) => ({ ...prev, status: 'hidden' }));
      }
    } catch (err) {
      const msg = err.response?.data?.message || '';
      setShowReportModal(false);
      if (msg.toLowerCase().includes('already reported')) {
        setHasReported(true);
        toast('You have already reported this item.', { icon: 'ℹ️' });
      } else {
        toast.error(msg || 'Unable to report. Please try again.');
      }
    } finally {
      setIsReporting(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatPrice = (price) =>
    `₹${Number(price).toLocaleString('en-IN')}`;

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

  const sellerName =
    typeof item?.seller === 'object'
      ? item.seller?.name || 'Seller'
      : 'Seller';

  // ── Loading Skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          {/* Back skeleton */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#E2E8F0] animate-shimmer" />
            <div className="h-5 w-28 rounded bg-[#E2E8F0] animate-shimmer" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Image skeleton */}
            <div className="lg:col-span-3">
              <div className="aspect-[4/3] rounded-2xl bg-[#E2E8F0] animate-shimmer" />
            </div>

            {/* Info skeleton */}
            <div className="lg:col-span-2 space-y-4">
              <div className="h-7 w-3/4 rounded bg-[#E2E8F0] animate-shimmer" />
              <div className="h-10 w-1/3 rounded bg-[#E2E8F0] animate-shimmer" />
              <div className="h-5 w-1/2 rounded bg-[#E2E8F0] animate-shimmer" />
              <div className="h-5 w-1/3 rounded bg-[#E2E8F0] animate-shimmer" />
              <div className="h-28 w-full rounded-xl bg-[#E2E8F0] animate-shimmer" />
              <div className="h-12 w-full rounded-xl bg-[#E2E8F0] animate-shimmer" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Not Found ──────────────────────────────────────────────────────────────
  if (error === 'not_found') {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <Navbar />
        <EmptyState
          icon={Package}
          title="Item Not Found"
          description="This listing may have been removed or is no longer available."
          actionLabel="Back to Marketplace"
          onAction={() => navigate('/home')}
        />
      </div>
    );
  }

  // ── Server Error ───────────────────────────────────────────────────────────
  if (error === 'server_error') {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-20 h-20 rounded-2xl bg-[#D97757]/10 flex items-center justify-center mb-6">
            <Package className="w-10 h-10 text-[#D97757]" />
          </div>
          <h3 className="text-xl font-semibold text-[#1E293B] mb-2">
            Unable to Load Item
          </h3>
          <p className="text-[#64748B] text-center max-w-sm mb-6">
            Something went wrong while loading this listing. Please try again.
          </p>
          <div className="flex gap-3">
            <button onClick={fetchItem} className="saas-button-primary">
              Try Again
            </button>
            <button
              onClick={() => navigate('/home')}
              className="saas-button-secondary"
            >
              Back to Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!item) return null;

  // ── Status Badge ───────────────────────────────────────────────────────────
  const StatusBadge = () => {
    const style = statusBanner[item.status];
    if (!style) return null;
    return (
      <span
        className={`inline-flex items-center text-sm font-medium px-3 py-1 rounded-lg ${style.bg} ${style.text}`}
      >
        {style.label}
      </span>
    );
  };

  // ── Contact Button Renderer ────────────────────────────────────────────────
  const ContactButton = () => {
    if (isOwnItem) {
      return (
        <div className="bg-[#84A98C]/10 border border-[#84A98C]/20 rounded-xl p-4">
          <p className="text-sm text-[#2F6B4F] font-medium">This is your listing</p>
          <button
            onClick={() => navigate('/my-listings')}
            className="text-xs text-[#2F6B4F] hover:underline mt-1"
          >
            Manage in My Listings →
          </button>
        </div>
      );
    }

    if (!isActive) {
      return (
        <button
          disabled
          className="w-full saas-button-primary opacity-50 cursor-not-allowed"
        >
          {item.status === 'sold' ? '🔴 Sold Out' : 'Unavailable'}
        </button>
      );
    }

    if (contactStatus === 'pending') {
      return (
        <button
          disabled
          className="w-full saas-button-secondary gap-2 opacity-80 cursor-not-allowed"
        >
          <Clock className="w-4 h-4 text-[#D97757]" />
          Pending Seller Approval
        </button>
      );
    }

    if (contactStatus === 'approved') {
      const sellerName = typeof item?.seller === 'object' ? item?.seller?.name : (sharedInfo?.sellerName || 'Seller');
      const hostel = sharedInfo?.hostelName || sharedInfo?.contact?.hostelName || sharedInfo?.itemId?.hostelName;
      const room = sharedInfo?.roomNumber || sharedInfo?.contact?.roomNumber || sharedInfo?.itemId?.roomNumber;
      const phone = sharedInfo?.sellerPhoneNumber || sharedInfo?.phoneNumber || sharedInfo?.contact?.phoneNumber || sharedInfo?.contact?.sellerPhoneNumber;

      return (
        <div className="bg-[#2F6B4F]/5 border border-[#2F6B4F]/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#2F6B4F]" />
              <span className="text-sm font-bold text-[#2F6B4F]">
                Contact Available
              </span>
            </div>
            {phone && (
              <a
                href={`tel:${phone}`}
                onClick={() => {
                  if (navigator.clipboard && phone) {
                    navigator.clipboard.writeText(phone).then(() => {
                      toast.success(`Copied phone number (${phone}) to clipboard!`);
                    }).catch(() => {});
                  }
                }}
                className="saas-button-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                Call Seller
              </a>
            )}
          </div>

          <div className="space-y-1.5 text-xs text-[#1E293B] pt-2 border-t border-[#2F6B4F]/10">
            {sellerName && (
              <div>
                <span className="text-[#64748B]">Seller: </span>
                <span className="font-semibold">{sellerName}</span>
              </div>
            )}

            {hostel && (
              <div>
                <span className="text-[#64748B]">Hostel: </span>
                <span className="font-semibold">{hostel}</span>
              </div>
            )}

            {room && (
              <div>
                <span className="text-[#64748B]">Room Number: </span>
                <span className="font-semibold">{room}</span>
              </div>
            )}

            {phone && (
              <div>
                <span className="text-[#64748B]">Phone Number: </span>
                <span className="font-semibold">{phone}</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (contactStatus === 'declined') {
      return (
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-5 h-5 text-[#64748B]" />
            <span className="text-sm font-medium text-[#64748B]">
              Request Declined
            </span>
          </div>
          <p className="text-xs text-[#64748B]">
            The seller has declined your contact request.
          </p>
        </div>
      );
    }

    return (
      <button
        onClick={handleRequestContact}
        disabled={contactStatus === 'requesting'}
        className="w-full saas-button-primary gap-2"
        aria-label="Request seller contact information"
      >
        {contactStatus === 'requesting' ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Sending Request...
          </>
        ) : (
          <>
            <MessageSquare className="w-4 h-4" />
            Request Contact
          </>
        )}
      </button>
    );
  };

  // ── Main Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* ── Back Button ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] flex items-center justify-center transition"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-[#64748B]" />
          </button>
          <span className="text-sm text-[#64748B]">Product Details</span>
        </div>

        {/* ── Main Grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-10">

          {/* ── Left: Image Carousel (3/5 width on desktop) ─────────────── */}
          <div className="lg:col-span-3">
            <ImageCarousel images={item.images || []} />
          </div>

          {/* ── Right: Product Info + Actions (2/5 width on desktop) ─────── */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Status badge (only shown for non-active items) */}
            <StatusBadge />

            {/* Category pill */}
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-[#84A98C]/10 text-[#2F6B4F] px-2.5 py-1 rounded-md">
                <Tag className="w-3 h-3" />
                {item.category}
              </span>
            </div>

            {/* Title + 3-dot menu */}
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1E293B] leading-tight flex-1">
                {item.title}
              </h1>

              {/* 3-dot menu (only for non-own items) */}
              {!isOwnItem && (
                <div className="relative flex-shrink-0" ref={menuRef}>
                  <button
                    onClick={() => setShowMenu((prev) => !prev)}
                    className="w-9 h-9 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] flex items-center justify-center transition"
                    aria-label="Open item actions"
                    aria-expanded={showMenu}
                    aria-haspopup="true"
                  >
                    <MoreVertical className="w-5 h-5 text-[#64748B]" />
                  </button>

                  {showMenu && (
                    <div
                      className="absolute right-0 top-11 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-20 min-w-[180px] overflow-hidden"
                      role="menu"
                    >
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          if (hasReported) {
                            toast('You have already reported this item.', { icon: 'ℹ️' });
                          } else {
                            setShowReportModal(true);
                          }
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[#D97757] hover:bg-[#D97757]/5 transition text-left"
                        role="menuitem"
                      >
                        <Flag className="w-4 h-4 flex-shrink-0" />
                        {hasReported ? 'Already Reported' : 'Report Item'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Price */}
            <p className="text-[#2F6B4F] font-bold text-3xl">
              {formatPrice(item.price)}
            </p>

            {/* Condition */}
            {item.condition && (
              <div>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-md ${
                    conditionStyles[item.condition] || 'bg-[#64748B]/10 text-[#64748B]'
                  }`}
                >
                  {item.condition}
                </span>
              </div>
            )}

            {/* Meta: College + Date */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-[#64748B]">
              {item.collegeName && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span>{item.collegeName}</span>
                </div>
              )}
              {item.createdAt && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>{formatDate(item.createdAt)}</span>
                </div>
              )}
            </div>

            {/* Description */}
            {item.description && (
              <div className="pt-4 border-t border-[#E2E8F0]">
                <h2 className="text-sm font-semibold text-[#1E293B] mb-2">
                  Description
                </h2>
                <p className="text-[#64748B] text-sm leading-relaxed whitespace-pre-line">
                  {item.description}
                </p>
              </div>
            )}

            {/* Seller Info */}
            <div className="pt-4 border-t border-[#E2E8F0]">
              <h2 className="text-sm font-semibold text-[#1E293B] mb-3">Seller</h2>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2F6B4F] flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-semibold">
                    {sellerName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1E293B]">{sellerName}</p>
                  <p className="text-xs text-[#64748B]">Campus Student</p>
                </div>

                {/* Wishlist button (only for non-own items) */}
                {!isOwnItem && (
                  <button
                    onClick={handleWishlist}
                    className="ml-auto w-9 h-9 rounded-full border border-[#E2E8F0] bg-white flex items-center justify-center hover:bg-[#F8FAFC] transition"
                    aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  >
                    <Heart
                      className={`w-4 h-4 transition ${
                        isWishlisted
                          ? 'fill-[#D97757] text-[#D97757]'
                          : 'text-[#64748B]'
                      }`}
                    />
                  </button>
                )}
              </div>
            </div>

            {/* ── Actions ───────────────────────────────────────────────── */}
            <div className="pt-4 border-t border-[#E2E8F0]">
              <ContactButton />
            </div>
          </div>
        </div>
      </main>

      {/* ── Report Modal ─────────────────────────────────────────────────── */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onConfirm={handleReport}
        isLoading={isReporting}
      />
    </div>
  );
};

export default ProductDetails;
