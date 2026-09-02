import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Inbox } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import NotificationCard from '../components/ui/NotificationCard';
import NotificationCardSkeleton from '../components/ui/NotificationCardSkeleton';
import SharePermissionModal from '../components/ui/SharePermissionModal';
import EmptyState from '../components/ui/EmptyState';
import { AuthContext } from '../context/AuthContext';

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Permission modal state
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [respondingId, setRespondingId] = useState(null);

  // Expiry notification action state (renew / delete-expired)
  const [renewingId, setRenewingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Mark notifications as read in localStorage (does NOT delete them)
  const markNotificationsRead = useCallback((notifList) => {
    if (!user) return;
    const readKey = `cm_read_notif_ids_${user.id || user._id}`;
    try {
      const existing = JSON.parse(localStorage.getItem(readKey) || '[]');
      const currentIds = notifList.map((n) => String(n._id));
      const merged = Array.from(new Set([...existing, ...currentIds]));
      localStorage.setItem(readKey, JSON.stringify(merged));
    } catch {
      // Ignore storage errors
    }
  }, [user]);

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

      // Sort notifications in NEWEST → OLDEST order (most recently created at the top)
      combined.sort((a, b) => {
        const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
        const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
        return timeB - timeA;
      });

      setNotifications(combined);

      // Mark all currently fetched notifications as read (badge will reset on next Navbar poll)
      markNotificationsRead(combined);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError(err.response?.data?.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [markNotificationsRead]);

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

  // ── Expiry: Renew listing ──────────────────────────────────────────────────
  const handleRenew = useCallback(async (notification) => {
    const itemId = notification.itemId?._id || notification.itemId;
    if (!itemId) return;
    setRenewingId(notification._id);
    try {
      await api.put(`/api/items/${itemId}/renew`);
      // Remove this expiry notification from the visible list
      setNotifications((prev) => prev.filter((n) => n._id !== notification._id));
      toast.success('Listing renewed! It is now visible in the marketplace again.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to renew listing. Please try again.';
      toast.error(msg);
    } finally {
      setRenewingId(null);
    }
  }, []);

  // ── Expiry: Delete listing ─────────────────────────────────────────────────
  const handleDeleteExpiredListing = useCallback(async (notification) => {
    const itemId = notification.itemId?._id || notification.itemId;
    if (!itemId) return;
    setDeletingId(notification._id);
    try {
      await api.delete(`/api/items/${itemId}`);
      // Remove this expiry notification from the visible list
      setNotifications((prev) => prev.filter((n) => n._id !== notification._id));
      toast.success('Listing deleted successfully.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete listing. Please try again.';
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  }, []);

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
                ? `${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`
                : 'Contact requests and updates'}
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
            title="No notifications yet"
            description="When buyers request contact or sellers respond to your requests, notifications will appear here."
          />
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <NotificationCard
                key={notification._id}
                notification={notification}
                onAccept={handleAccept}
                onDecline={handleDecline}
                onRenew={handleRenew}
                onDeleteExpired={handleDeleteExpiredListing}
                isResponding={respondingId === notification._id || renewingId === notification._id}
                isDeleting={deletingId === notification._id}
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
