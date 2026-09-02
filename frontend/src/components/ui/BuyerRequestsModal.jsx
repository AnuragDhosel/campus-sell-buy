import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Users,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Mail,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import SharePermissionModal from './SharePermissionModal';

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const StatusBadge = ({ status }) => {
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    );
  }
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-[#2F6B4F]/10 text-[#2F6B4F] border border-[#2F6B4F]/20">
        <CheckCircle className="w-3 h-3" />
        Approved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-[#D97757]/10 text-[#D97757] border border-[#D97757]/20">
      <XCircle className="w-3 h-3" />
      Declined
    </span>
  );
};

const BuyerRequestsModal = ({ isOpen, onClose, item }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Permission modal state (reusing existing SharePermissionModal)
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [respondingId, setRespondingId] = useState(null);

  const fetchRequests = useCallback(async () => {
    if (!item?._id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/handshakes/item/' + item._id + '/requests');
      setRequests(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch buyer requests:', err);
      setError(err.response?.data?.message || 'Failed to load buyer requests.');
    } finally {
      setLoading(false);
    }
  }, [item?._id]);

  useEffect(() => {
    if (isOpen && item?._id) {
      fetchRequests();
    }
  }, [isOpen, item?._id, fetchRequests]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !showPermissionModal) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, showPermissionModal]);

  const handleDecline = async (handshakeId) => {
    setRespondingId(handshakeId);
    try {
      await api.put('/api/handshakes/' + handshakeId + '/respond', {
        status: 'declined',
        shareHostel: false,
        shareMobile: false,
        shareRoomNumber: false,
        sharePhoneNumber: false,
      });
      toast.success('Request declined.');
      setRequests((prev) =>
        prev.map((r) =>
          r._id === handshakeId ? { ...r, status: 'declined' } : r
        )
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decline request.');
    } finally {
      setRespondingId(null);
    }
  };

  const handleAcceptClick = (request) => {
    setSelectedRequest(request);
    setShowPermissionModal(true);
  };

  const handleConfirmApprove = async ({ shareHostel, shareMobile }) => {
    if (!selectedRequest) return;
    setIsResponding(true);
    try {
      await api.put('/api/handshakes/' + selectedRequest._id + '/respond', {
        status: 'approved',
        shareHostel,
        shareMobile,
        shareRoomNumber: shareHostel,
        sharePhoneNumber: shareMobile,
      });
      toast.success('Request approved!');
      setRequests((prev) =>
        prev.map((r) =>
          r._id === selectedRequest._id
            ? {
                ...r,
                status: 'approved',
                sharedDetails: {
                  shareHostel,
                  shareMobile,
                  shareRoomNumber: shareHostel,
                  sharePhoneNumber: shareMobile,
                },
              }
            : r
        )
      );
      setShowPermissionModal(false);
      setSelectedRequest(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve request.');
    } finally {
      setIsResponding(false);
    }
  };

  if (!isOpen) return null;

  const buyerName = selectedRequest?.buyerId?.name || 'this buyer';

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="buyer-requests-title"
        >
          <div className="flex items-start justify-between p-5 border-b border-[#E2E8F0] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2F6B4F]/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#2F6B4F]" />
              </div>
              <div>
                <h2
                  id="buyer-requests-title"
                  className="text-base font-bold text-[#1E293B] leading-tight"
                >
                  Buyer Requests
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5 line-clamp-1">
                  {item?.title}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[#F8FAFC] transition text-[#64748B] hover:text-[#1E293B]"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!loading && !error && (
            <div className="px-5 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] shrink-0">
              <p className="text-sm text-[#64748B]">
                <span className="font-semibold text-[#1E293B]">
                  {requests.length}
                </span>{' '}
                buyer{requests.length !== 1 ? 's' : ''} requested this item
              </p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-7 h-7 text-[#2F6B4F] animate-spin" />
                <p className="text-sm text-[#64748B]">Loading requests...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
                <XCircle className="w-8 h-8 text-[#D97757]" />
                <p className="text-sm text-[#64748B]">{error}</p>
                <button
                  onClick={fetchRequests}
                  className="saas-button-secondary text-sm py-2 px-4"
                >
                  Retry
                </button>
              </div>
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
                <Users className="w-10 h-10 text-[#E2E8F0]" />
                <p className="text-sm font-medium text-[#1E293B]">No requests yet</p>
                <p className="text-xs text-[#64748B]">
                  No buyers have requested contact for this item.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[#E2E8F0]">
                {requests.map((request, index) => {
                  const buyer = request.buyerId || {};
                  const isPending = request.status === 'pending';
                  const isThisResponding = respondingId === request._id;

                  return (
                    <li key={request._id} className="p-5 hover:bg-[#F8FAFC] transition">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-[#2F6B4F]/10 flex items-center justify-center shrink-0">
                            <span className="text-sm font-semibold text-[#2F6B4F]">
                              {buyer.name ? buyer.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-[#1E293B] truncate">
                                {index + 1}. {buyer.name || 'Unknown Buyer'}
                              </span>
                              <StatusBadge status={request.status} />
                            </div>

                            <div className="mt-1.5 space-y-1">
                              {buyer.email && (
                                <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                                  <Mail className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{buyer.email}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                                <Calendar className="w-3 h-3 shrink-0" />
                                <span>Requested {formatDate(request.createdAt)}</span>
                              </div>
                            </div>

                            {request.status === 'approved' && request.sharedDetails && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {(request.sharedDetails.shareRoomNumber || request.sharedDetails.shareHostel) && (
                                  <span className="text-xs px-2 py-0.5 rounded-md bg-[#2F6B4F]/10 text-[#2F6B4F]">
                                    Room shared
                                  </span>
                                )}
                                {(request.sharedDetails.sharePhoneNumber || request.sharedDetails.shareMobile) && (
                                  <span className="text-xs px-2 py-0.5 rounded-md bg-[#2F6B4F]/10 text-[#2F6B4F]">
                                    Mobile shared
                                  </span>
                                )}
                                {!request.sharedDetails.shareRoomNumber &&
                                  !request.sharedDetails.shareHostel &&
                                  !request.sharedDetails.sharePhoneNumber &&
                                  !request.sharedDetails.shareMobile && (
                                    <span className="text-xs text-[#64748B]">No details shared</span>
                                  )}
                              </div>
                            )}
                          </div>
                        </div>

                        {isPending && (
                          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                            <button
                              onClick={() => handleAcceptClick(request)}
                              disabled={isThisResponding || isResponding}
                              className="inline-flex items-center justify-center text-xs font-medium py-1.5 px-3 rounded-lg bg-[#2F6B4F] hover:bg-[#26573F] text-white transition disabled:opacity-50 gap-1"
                              aria-label={'Accept request from ' + (buyer.name || 'buyer')}
                            >
                              {isThisResponding ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <CheckCircle className="w-3 h-3" />
                              )}
                              Accept
                            </button>
                            <button
                              onClick={() => handleDecline(request._id)}
                              disabled={isThisResponding || isResponding}
                              className="inline-flex items-center justify-center text-xs font-medium py-1.5 px-3 rounded-lg border border-[#E2E8F0] text-[#D97757] hover:bg-[#D97757]/5 hover:border-[#D97757]/30 transition disabled:opacity-50 gap-1"
                              aria-label={'Decline request from ' + (buyer.name || 'buyer')}
                            >
                              <XCircle className="w-3 h-3" />
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="p-4 border-t border-[#E2E8F0] shrink-0">
            <button onClick={onClose} className="saas-button-secondary w-full text-sm">
              Close
            </button>
          </div>
        </div>
      </div>

      <SharePermissionModal
        isOpen={showPermissionModal}
        onClose={() => {
          setShowPermissionModal(false);
          setSelectedRequest(null);
        }}
        onConfirm={handleConfirmApprove}
        isLoading={isResponding}
        buyerName={buyerName}
      />
    </>
  );
};

export default BuyerRequestsModal;
