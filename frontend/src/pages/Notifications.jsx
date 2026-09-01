import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Inbox } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import NotificationCard from '../components/ui/NotificationCard';
import NotificationCardSkeleton from '../components/ui/NotificationCardSkeleton';
import SharePermissionModal from '../components/ui/SharePermissionModal';
import EmptyState from '../components/ui/EmptyState';

const Notifications = () => {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Permission modal state
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [respondingId, setRespondingId] = useState(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sellerRes, buyerRes] = await Promise.allSettled([
        api.get('/api/handshakes/my-notifications'),
        api.get('/api/handshakes/my-requests'),
      ]);

      const sellerNotifications = sellerRes.status === 'fulfilled' ? (sellerRes.value.data?.data || []) : [];
      const buyerRequests = buyerRes.status === 'fulfilled' ? (buyerRes.value.data?.data || []) : [];

      // Combine seller pending notifications with buyer accepted/declined response notifications
      const combined = [
        ...sellerNotifications,
        ...buyerRequests.filter((req) => req.status === 'approved' || req.status === 'declined'),
      ];

      // Sort by newest
      combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setNotifications(combined);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError(err.response?.data?.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Decline handler
  const handleDecline = useCallback(async (notification) => {
    setRespondingId(notification._id);
    try {
      await api.put(`/api/handshakes/${notification._id}/respond`, {
        status: 'declined',
      });
      // Remove from list
      setNotifications((prev) => prev.filter((n) => n._id !== notification._id));
      toast.success('Request declined.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to decline request.';
      toast.error(msg);
    } finally {
      setRespondingId(null);
    }
  }, []);

  // Accept handler — opens permission modal
  const handleAccept = useCallback((notification) => {
    setSelectedNotification(notification);
    setShowPermissionModal(true);
  }, []);

  // Confirm share with permissions
  const handleConfirmShare = async ({ shareHostel, shareMobile }) => {
    if (!selectedNotification) return;

    setIsResponding(true);
    try {
      await api.put(`/api/handshakes/${selectedNotification._id}/respond`, {
        status: 'approved',
        shareHostel,
        shareRoomNumber: shareHostel,
        shareMobile,
        sharePhoneNumber: shareMobile,
      });
      // Remove from list
      setNotifications((prev) => prev.filter((n) => n._id !== selectedNotification._id));
      setShowPermissionModal(false);
      setSelectedNotification(null);
      toast.success('Contact information shared successfully!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to approve request.';
      toast.error(msg);
    } finally {
      setIsResponding(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate('/home')}
            className="w-10 h-10 rounded-xl border border-[#E2E8F0] flex items-center justify-center hover:bg-white transition"
            aria-label="Back to marketplace"
          >
            <ArrowLeft className="w-5 h-5 text-[#64748B]" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1E293B]">Notifications</h1>
            <p className="text-[#64748B] text-sm mt-0.5">
              {!loading && !error
                ? `${notifications.length} pending request${notifications.length !== 1 ? 's' : ''}`
                : 'Contact requests from buyers'}
            </p>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4" aria-busy="true" aria-label="Loading notifications">
            {Array.from({ length: 3 }).map((_, index) => (
              <NotificationCardSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={Bell}
            title="Something went wrong"
            description={error}
            actionLabel="Try Again"
            onAction={fetchNotifications}
          />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No pending requests"
            description="When buyers request contact for your items, notifications will appear here."
          />
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <NotificationCard
                key={notification._id}
                notification={notification}
                onAccept={handleAccept}
                onDecline={handleDecline}
                isResponding={respondingId === notification._id}
              />
            ))}
          </div>
        )}
      </main>

      {/* Share Permission Modal */}
      <SharePermissionModal
        isOpen={showPermissionModal}
        onClose={() => {
          setShowPermissionModal(false);
          setSelectedNotification(null);
        }}
        onConfirm={handleConfirmShare}
        isLoading={isResponding}
        buyerName={selectedNotification?.buyerId?.name || 'Buyer'}
      />
    </div>
  );
};

export default Notifications;
