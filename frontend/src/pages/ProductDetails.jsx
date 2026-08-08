import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Calendar, Tag, MoreVertical, Flag,
  MessageSquare, Clock, CheckCircle2, XCircle, Loader2, Package, User as UserIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import ImageCarousel from '../components/ui/ImageCarousel';
import ReportModal from '../components/ui/ReportModal';
import EmptyState from '../components/ui/EmptyState';
import { AuthContext } from '../context/AuthContext';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Handshake state
  const [handshakeStatus, setHandshakeStatus] = useState(null); // null, 'pending', 'approved', 'declined'
  const [handshakeData, setHandshakeData] = useState(null);
  const [isRequesting, setIsRequesting] = useState(false);

  // Report state
  const [showReportModal, setShowReportModal] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [hasReported, setHasReported] = useState(false);

  // Context menu
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // Fetch item data
  useEffect(() => {
    const fetchItem = async () => {
      setLoading(true);
      setError(null);
      try {
        // No GET /api/items/:id endpoint exists — fetch all and find by ID
        const response = await api.get('/api/items');
        const allItems = response.data?.data || [];
        const found = allItems.find((i) => i._id === id);

        if (!found) {
          setError('not_found');
        } else {
          setItem(found);
        }
      } catch (err) {
        console.error('Failed to fetch item:', err);
        setError('server_error');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchItem();
  }, [id]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const isOwnItem = useCallback(() => {
    if (!user || !item) return false;
    const sellerId = typeof item.seller === 'object' ? item.seller._id : item.seller;
    return sellerId === user.id;
  }, [user, item]);

  const isItemActive = item?.status === 'available';

  // Request contact
  const handleRequestContact = async () => {
    if (isRequesting || handshakeStatus || !item) return;

    setIsRequesting(true);
    try {
      const sellerId = typeof item.seller === 'object' ? item.seller._id : item.seller;
      await api.post('/api/handshakes/request', {
        itemId: item._id,
        sellerId,
      });
      setHandshakeStatus('pending');
      toast.success('Contact request sent! The seller will be notified.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send request.';
      if (msg.includes('already have an active request')) {
        setHandshakeStatus('pending');
        toast('You already have a pending request for this item.', { icon: 'ℹ️' });
      } else if (msg.includes('your own item')) {
        toast.error('You cannot request contact for your own item.');
      } else {
        toast.error(msg);
      }
    } finally {
      setIsRequesting(false);
    }
  };

  // Report item
  const handleReport = async () => {
    if (isReporting || !item) return;

    setIsReporting(true);
    try {
      const response = await api.put(`/api/items/${item._id}/report`);
      setHasReported(true);
      setShowReportModal(false);
      toast.success(response.data?.message || 'Report submitted. Thank you!');

      // If auto-hidden
      if (response.data?.itemStatus === 'hidden') {
        setItem((prev) => ({ ...prev, status: 'hidden' }));
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit report.';
      if (msg.includes('already reported')) {
        setHasReported(true);
        toast('You have already reported this item.', { icon: 'ℹ️' });
      } else {
        toast.error(msg);
      }
      setShowReportModal(false);
    } finally {
      setIsReporting(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getStatusBadge = () => {
    if (!item) return null;
    const styles = {
      available: null, // Don't show badge for active items
      sold: { bg: 'bg-[#64748B]/10', text: 'text-[#64748B]', label: 'Sold Out' },
      hidden: { bg: 'bg-[#D97757]/10', text: 'text-[#D97757]', label: 'Under Review' },
      archived: { bg: 'bg-[#64748B]/10', text: 'text-[#64748B]', label: 'Unavailable' },
      action_required: { bg: 'bg-[#D97757]/10', text: 'text-[#D97757]', label: 'Action Required' },
    };
    const style = styles[item.status];
    if (!style) return null;
    return (
      <span className={`inline-flex items-center text-sm font-medium px-3 py-1 rounded-lg ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#E2E8F0] animate-shimmer" />
            <div className="h-6 w-32 rounded bg-[#E2E8F0] animate-shimmer" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3">
              <div className="aspect-[4/3] rounded-2xl bg-[#E2E8F0] animate-shimmer" />
            </div>
            <div className="lg:col-span-2 space-y-4">
              <div className="h-8 w-3/4 rounded bg-[#E2E8F0] animate-shimmer" />
              <div className="h-10 w-1/3 rounded bg-[#E2E8F0] animate-shimmer" />
              <div className="h-4 w-1/2 rounded bg-[#E2E8F0] animate-shimmer" />
              <div className="h-24 w-full rounded bg-[#E2E8F0] animate-shimmer mt-4" />
              <div className="h-12 w-full rounded-xl bg-[#E2E8F0] animate-shimmer mt-6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error states
  if (error === 'not_found') {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <Navbar />
        <EmptyState
          icon={Package}
          title="Item Not Found"
          description="This item may have been removed or doesn't exist."
          actionLabel="Back to Marketplace"
          onAction={() => navigate('/home')}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <Navbar />
        <EmptyState
          icon={Package}
          title="Something went wrong"
          description="Failed to load item details. Please try again."
          actionLabel="Back to Marketplace"
          onAction={() => navigate('/home')}
        />
      </div>
    );
  }

  if (!item) return null;

  const sellerName = typeof item.seller === 'object' ? item.seller.name : 'Seller';

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Back Button */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl border border-[#E2E8F0] flex items-center justify-center hover:bg-white transition"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-[#64748B]" />
          </button>
          <span className="text-sm text-[#64748B]">Product Details</span>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Image Carousel */}
          <div className="lg:col-span-3">
            <ImageCarousel images={item.images} />
          </div>

          {/* Right: Product Info */}
          <div className="lg:col-span-2">
            {/* Status Badge */}
            {getStatusBadge()}

            {/* Category */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="inline-block text-xs font-medium bg-[#84A98C]/10 text-[#2F6B4F] px-2.5 py-1 rounded-md">
                {item.category}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1E293B] mt-3">
              {item.title}
            </h1>

            {/* Price */}
            <p className="text-[#2F6B4F] font-bold text-3xl mt-2">
              ₹{item.price?.toLocaleString('en-IN')}
            </p>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-[#64748B]">
              {(item.collegeName || item.college) && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span>{item.collegeName || item.college}</span>
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
            <div className="mt-6 pt-6 border-t border-[#E2E8F0]">
              <h2 className="text-sm font-semibold text-[#1E293B] mb-2">Description</h2>
              <p className="text-[#64748B] text-sm leading-relaxed whitespace-pre-line">
                {item.description || 'No description provided.'}
              </p>
            </div>

            {/* Seller Info */}
            <div className="mt-6 pt-6 border-t border-[#E2E8F0]">
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
              </div>
            </div>

            {/* Action Area */}
            <div className="mt-6 pt-6 border-t border-[#E2E8F0]">
              {/* Contact Request Button */}
              {!isOwnItem() && (
                <div className="space-y-3">
                  {handshakeStatus === 'pending' ? (
                    <button
                      disabled
                      className="w-full saas-button-secondary gap-2 opacity-80 cursor-not-allowed"
                    >
                      <Clock className="w-4 h-4 text-[#D97757]" />
                      Pending Seller Approval
                    </button>
                  ) : handshakeStatus === 'approved' ? (
                    <div className="bg-[#2F6B4F]/5 border border-[#2F6B4F]/20 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-5 h-5 text-[#2F6B4F]" />
                        <span className="text-sm font-semibold text-[#2F6B4F]">Request Approved</span>
                      </div>
                      <p className="text-xs text-[#64748B]">
                        The seller has approved your contact request. Shared information will be available when the backend supports contact detail retrieval.
                      </p>
                    </div>
                  ) : handshakeStatus === 'declined' ? (
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle className="w-5 h-5 text-[#64748B]" />
                        <span className="text-sm font-medium text-[#64748B]">Request Declined</span>
                      </div>
                      <p className="text-xs text-[#64748B]">
                        The seller has declined your contact request.
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={handleRequestContact}
                      disabled={isRequesting || !isItemActive}
                      className="w-full saas-button-primary gap-2"
                    >
                      {isRequesting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending Request...
                        </>
                      ) : !isItemActive ? (
                        'Item Unavailable'
                      ) : (
                        <>
                          <MessageSquare className="w-4 h-4" />
                          Request Contact
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {isOwnItem() && (
                <div className="bg-[#84A98C]/10 border border-[#84A98C]/20 rounded-xl p-4">
                  <p className="text-sm text-[#2F6B4F] font-medium">This is your listing</p>
                  <p className="text-xs text-[#64748B] mt-1">
                    Visit My Listings to manage this item.
                  </p>
                </div>
              )}
            </div>

            {/* 3-Dot Menu */}
            {!isOwnItem() && (
              <div className="mt-4 relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 rounded-lg hover:bg-[#F8FAFC] border border-[#E2E8F0] transition"
                  aria-label="More options"
                  aria-expanded={showMenu}
                >
                  <MoreVertical className="w-5 h-5 text-[#64748B]" />
                </button>

                {showMenu && (
                  <div className="absolute left-0 mt-1 bg-white border border-[#E2E8F0] rounded-xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.08)] p-1 min-w-[180px] z-10">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        if (hasReported) {
                          toast('You have already reported this item.', { icon: 'ℹ️' });
                        } else {
                          setShowReportModal(true);
                        }
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#D97757] hover:bg-[#D97757]/5 transition text-left"
                    >
                      <Flag className="w-4 h-4" />
                      {hasReported ? 'Already Reported' : 'Report Item'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Report Modal */}
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
