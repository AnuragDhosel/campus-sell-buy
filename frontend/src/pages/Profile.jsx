/**
 * @file pages/Profile.jsx
 * @description User profile page matching user-specified ASCII design layout.
 *
 * Structure:
 *  - Header Section: Avatar, Name, Email, Member since date
 *  - Account Information: Name, Email, Account type (Student/Admin), College, Hostel, Room, Mobile
 *  - Marketplace Activity: Stats cards for Active Listings, Wishlist, Requests
 *  - Quick Actions: Buttons to navigate to My Listings, Wishlist, Notifications
 *  - Account: Working Logout button with backend notification + local auth state reset & redirect
 */

import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Building2,
  GraduationCap,
  Phone,
  MapPin,
  Calendar,
  Package,
  Heart,
  Bell,
  LogOut,
  Shield,
  LayoutList,
  ChevronRight,
  HelpCircle,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import EmptyState from '../components/ui/EmptyState';
import { AuthContext } from '../context/AuthContext';
import { WishlistContext } from '../context/WishlistContext';

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const { wishlist } = useContext(WishlistContext);

  const [profile, setProfile] = useState(null);
  const [activeListingsCount, setActiveListingsCount] = useState(0);
  const [requestsCount, setRequestsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    const fetchProfileAndStats = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch user profile from GET /api/auth/me (backend returns { success: true, user: { ... } })
        const profileRes = await api.get('/api/auth/me');
        const userData = profileRes.data?.user || profileRes.data?.data || user;
        setProfile(userData);

        const currentUserId = userData?._id || userData?.id || user?.id || user?._id;

        // 2. Fetch Active Listings count
        try {
          const itemsRes = await api.get(`/api/items?seller=${currentUserId}`);
          const allItems = itemsRes.data?.data || [];
          const myItems = allItems.filter((item) => {
            const sellerId =
              typeof item.seller === 'object' ? item.seller?._id : item.seller;
            return String(sellerId) === String(currentUserId);
          });
          setActiveListingsCount(myItems.length);
        } catch {
          // Silently handle stat fetch errors
          setActiveListingsCount(0);
        }

        // 3. Fetch Notifications / Requests count
        try {
          const notifRes = await api.get('/api/handshakes/my-notifications');
          const notifData = notifRes.data?.data || [];
          setRequestsCount(notifData.length);
        } catch {
          // Silently handle stat fetch errors
          setRequestsCount(0);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        if (user) {
          // Fallback to AuthContext user if available so profile is displayed
          setProfile(user);
        } else {
          setError(err.response?.data?.message || 'Failed to load profile.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndStats();
  }, [user?.id]);

  // Full working Logout Handler
  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      console.error('Backend logout error:', err.message);
    }
    logout();
    toast.success('Logged out successfully!');
    navigate('/login');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Aug 2026';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      month: 'short',
      year: 'numeric',
    });
  };

  const formatFullDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#E2E8F0] animate-shimmer" />
            <div className="h-7 w-36 rounded bg-[#E2E8F0] animate-shimmer" />
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-20 h-20 rounded-full bg-[#E2E8F0] animate-shimmer" />
              <div className="h-6 w-40 rounded bg-[#E2E8F0] animate-shimmer" />
              <div className="h-4 w-52 rounded bg-[#E2E8F0] animate-shimmer" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="h-20 rounded-xl bg-[#E2E8F0] animate-shimmer" />
              <div className="h-20 rounded-xl bg-[#E2E8F0] animate-shimmer" />
              <div className="h-20 rounded-xl bg-[#E2E8F0] animate-shimmer" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <Navbar />
        <EmptyState
          icon={User}
          title="Unable to Load Profile"
          description={error}
          actionLabel="Try Again"
          onAction={() => window.location.reload()}
        />
      </div>
    );
  }

  const activeProfile = profile || user;

  if (!activeProfile && !loading && !error) return null;
  const currentProfile = activeProfile || {};

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Header Navigation */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/home')}
            className="w-10 h-10 rounded-xl border border-[#E2E8F0] bg-white flex items-center justify-center hover:bg-[#F8FAFC] transition shadow-sm"
            aria-label="Back to marketplace"
          >
            <ArrowLeft className="w-5 h-5 text-[#64748B]" />
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1E293B]">
            My Profile
          </h1>
        </div>

        {/* Outer Card Container */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] overflow-hidden divide-y divide-[#E2E8F0]">
          
          {/* HEADER SECTION: User Profile Summary */}
          <div className="p-6 text-center flex flex-col items-center bg-gradient-to-b from-[#2F6B4F]/5 to-transparent">
            <div className="w-20 h-20 rounded-full bg-[#2F6B4F] flex items-center justify-center shadow-md mb-4 ring-4 ring-white">
              <span className="text-white text-3xl font-bold">
                {currentProfile.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B]">
              {currentProfile.name || 'User'}
            </h2>
            <p className="text-sm text-[#64748B] mt-0.5">{currentProfile.email || ''}</p>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-[#2F6B4F] font-medium bg-[#2F6B4F]/10 px-3 py-1 rounded-full">
              <Calendar className="w-3.5 h-3.5" />
              <span>Member since {formatDate(currentProfile.createdAt)}</span>
            </div>
          </div>

          {/* SECTION 1: Account Information */}
          <div className="p-6">
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#84A98C]" />
              Account Information
            </h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-[#F1F5F9]">
                <span className="text-[#64748B] font-medium">Name</span>
                <span className="text-[#1E293B] font-semibold">{currentProfile.name || '—'}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-[#F1F5F9]">
                <span className="text-[#64748B] font-medium">Email</span>
                <span className="text-[#1E293B] font-semibold">{currentProfile.email || '—'}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-[#F1F5F9]">
                <span className="text-[#64748B] font-medium">Account</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#2F6B4F]/10 text-[#2F6B4F]">
                  {currentProfile.role === 'admin' ? 'Admin' : 'Student'}
                </span>
              </div>

              {currentProfile.collegeName && (
                <div className="flex justify-between items-center py-2 border-b border-[#F1F5F9]">
                  <span className="text-[#64748B] font-medium">College</span>
                  <span className="text-[#1E293B] font-semibold">{currentProfile.collegeName}</span>
                </div>
              )}

              {currentProfile.hostelName && (
                <div className="flex justify-between items-center py-2 border-b border-[#F1F5F9]">
                  <span className="text-[#64748B] font-medium">Hostel & Room</span>
                  <span className="text-[#1E293B] font-semibold">{currentProfile.hostelName} {currentProfile.roomNumber ? `(${currentProfile.roomNumber})` : ''}</span>
                </div>
              )}

              {currentProfile.mobileNumber && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-[#64748B] font-medium">Mobile</span>
                  <span className="text-[#1E293B] font-semibold">{currentProfile.mobileNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: Marketplace Activity */}
          <div className="p-6">
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-[#84A98C]" />
              Marketplace Activity
            </h3>

            <div className="grid grid-cols-3 gap-3 sm:gap-4 text-center">
              {/* Stat 1: Active Listings */}
              <div 
                onClick={() => navigate('/my-listings')}
                className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 sm:p-4 cursor-pointer hover:border-[#84A98C] transition group"
              >
                <div className="text-xl sm:text-2xl font-bold text-[#1E293B] group-hover:text-[#2F6B4F] transition">
                  {activeListingsCount}
                </div>
                <div className="text-xs text-[#64748B] mt-1 font-medium">
                  Active Listings
                </div>
              </div>

              {/* Stat 2: Wishlist */}
              <div 
                onClick={() => navigate('/wishlist')}
                className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 sm:p-4 cursor-pointer hover:border-[#84A98C] transition group"
              >
                <div className="text-xl sm:text-2xl font-bold text-[#1E293B] group-hover:text-[#D97757] transition">
                  {wishlist.length}
                </div>
                <div className="text-xs text-[#64748B] mt-1 font-medium">
                  Wishlist
                </div>
              </div>

              {/* Stat 3: Requests */}
              <div 
                onClick={() => navigate('/notifications')}
                className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 sm:p-4 cursor-pointer hover:border-[#84A98C] transition group"
              >
                <div className="text-xl sm:text-2xl font-bold text-[#1E293B] group-hover:text-[#2F6B4F] transition">
                  {requestsCount}
                </div>
                <div className="text-xs text-[#64748B] mt-1 font-medium">
                  Requests
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Quick Actions */}
          <div className="p-6">
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-4 flex items-center gap-2">
              <LayoutList className="w-4 h-4 text-[#84A98C]" />
              Quick Actions
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => navigate('/my-listings')}
                className="flex items-center justify-between px-4 py-3 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] hover:border-[#84A98C] transition group text-left shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-[#2F6B4F]" />
                  <span className="text-sm font-semibold text-[#1E293B]">My Listings</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#64748B] group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => navigate('/wishlist')}
                className="flex items-center justify-between px-4 py-3 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] hover:border-[#84A98C] transition group text-left shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <Heart className="w-4 h-4 text-[#D97757]" />
                  <span className="text-sm font-semibold text-[#1E293B]">Wishlist</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#64748B] group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => navigate('/notifications')}
                className="flex items-center justify-between px-4 py-3 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] hover:border-[#84A98C] transition group text-left shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-[#2F6B4F]" />
                  <span className="text-sm font-semibold text-[#1E293B]">Notifications</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#64748B] group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* SECTION 3b: Help & Support */}
          <div className="p-6">
            <button
              onClick={() => setShowHelpModal(true)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] hover:border-[#84A98C] transition group text-left shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-[#2F6B4F]" />
                <span className="text-sm font-semibold text-[#1E293B]">Help &amp; Support</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#64748B] group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* SECTION 4: Account & Logout */}
          <div className="p-6 bg-[#F8FAFC]/50">
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-3">
              Account
            </h3>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-semibold text-sm transition shadow-sm active:scale-[0.99]"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>

        </div>
      </main>

      {/* Help & Support Modal */}
      {showHelpModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowHelpModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-[#E2E8F0] w-full max-w-sm p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B] transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon + title */}
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-12 h-12 rounded-xl bg-[#2F6B4F]/10 flex items-center justify-center mb-3">
                <HelpCircle className="w-6 h-6 text-[#2F6B4F]" />
              </div>
              <h2 className="text-lg font-bold text-[#1E293B]">Help &amp; Support</h2>
              <p className="text-sm text-[#64748B] mt-1">
                Need help? Contact us using the email below.
              </p>
            </div>

            {/* Support email display */}
            <div className="flex items-center gap-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 mb-5">
              <Mail className="w-4 h-4 text-[#2F6B4F] shrink-0" />
              <span className="text-sm font-semibold text-[#1E293B] break-all">
                use2ndanywhere254@gmail.com
              </span>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-2">
              <a
                href="https://mail.google.com/mail/?view=cm&fs=1&to=use2ndanywhere254@gmail.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#2F6B4F] hover:bg-[#245539] text-white font-semibold text-sm transition"
              >
                <Mail className="w-4 h-4" />
                Send Email
              </a>
              <button
                onClick={() => setShowHelpModal(false)}
                className="w-full flex items-center justify-center px-4 py-3 rounded-xl border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] font-semibold text-sm transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;

