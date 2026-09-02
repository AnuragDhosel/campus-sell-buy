import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ShoppingBag, Plus, Heart, Bell, User, Menu, X, LogOut, LayoutList, Inbox } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [badgeCount, setBadgeCount] = useState(0);
  const mobileMenuRef = useRef(null);
  const profileDropdownRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    if (mobileMenuOpen || profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen, profileDropdownOpen]);

  // Close menus on Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setProfileDropdownOpen(false);
      }
    };
    if (mobileMenuOpen || profileDropdownOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileMenuOpen, profileDropdownOpen]);

  const handleSellItem = () => {
    navigate('/sell');
  };

  const handleWishlist = () => {
    navigate('/wishlist');
  };

  const handleNotifications = () => {
    navigate('/notifications');
  };

  // Fetch notification badge — counts only UNREAD notifications (by ID tracking)
  useEffect(() => {
    if (!user) {
      setBadgeCount(0);
      return;
    }

    // Storage key holds a JSON array of notification _id strings the user has already seen
    const readKey = `cm_read_notif_ids_${user.id || user._id}`;

    const fetchNotificationCounts = async () => {
      try {
        const [sellerRes, buyerRes] = await Promise.allSettled([
          api.get('/api/handshakes/my-notifications'),
          api.get('/api/handshakes/my-requests'),
        ]);

        const sellerNotifications = sellerRes.status === 'fulfilled' ? (sellerRes.value.data?.data || []) : [];
        const buyerRequests = buyerRes.status === 'fulfilled' ? (buyerRes.value.data?.data || []) : [];

        // All notification-eligible items
        const allNotifications = [
          ...sellerNotifications,
          ...buyerRequests.filter((req) => req.status === 'approved' || req.status === 'declined'),
        ];

        // Load previously-read IDs from localStorage
        let readIds = [];
        try {
          readIds = JSON.parse(localStorage.getItem(readKey) || '[]');
        } catch {
          readIds = [];
        }
        const readSet = new Set(readIds);

        if (location.pathname === '/notifications') {
          // User is on the notifications page — mark all current notifications as read
          const currentIds = allNotifications.map((n) => String(n._id));
          const merged = Array.from(new Set([...readIds, ...currentIds]));
          localStorage.setItem(readKey, JSON.stringify(merged));
          setBadgeCount(0);
        } else {
          // Count notifications whose _id has NOT been seen before
          const unreadCount = allNotifications.filter((n) => !readSet.has(String(n._id))).length;
          setBadgeCount(unreadCount);
        }
      } catch {
        // Silently fail — badge just won't show
      }
    };

    fetchNotificationCounts();

    // Poll periodically and on focus to capture background cron expiry and moderation notifications
    const interval = setInterval(fetchNotificationCounts, 10000);
    window.addEventListener('focus', fetchNotificationCounts);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', fetchNotificationCounts);
    };
  }, [location.pathname, user]);

  // ── Logout ─────────────────────────────────────────────────────────────────
  // Full logout flow:
  //   1. Call the backend POST /api/auth/logout  → backend acknowledges the logout.
  //   2. Remove the JWT from localStorage        → done inside context logout().
  //   3. Clear the authenticated user state      → done inside context logout().
  //   4. Redirect to /login                      → navigate() here.
  //
  // Why call the backend at all if JWT is stateless?
  //   The backend cannot revoke a stateless JWT, but calling the endpoint is good
  //   practice: it provides a clean API contract, server-side logging, and
  //   extensibility if token revocation is ever added (e.g., Redis blacklist).
  //
  // Why not put navigate() inside AuthContext?
  //   AuthContext is a React Context provider — it does not have access to
  //   React Router's useNavigate hook outside a Router subtree. Navigation
  //   is the responsibility of the component (Navbar), not the context.
  //
  // Graceful degradation:
  //   Even if the backend request fails (network error, expired token), we still
  //   complete the local logout (remove token, clear state, redirect). The user
  //   should never be stuck in a "half-logged-out" state due to a backend failure.
  const handleLogout = async () => {
    setMobileMenuOpen(false);

    try {
      // Step 1: Notify the backend about the logout.
      // The Authorization header is automatically attached by api.js interceptor.
      await api.post('/api/auth/logout');
    } catch (error) {
      // Backend call failed (network issue, expired token, etc.).
      // Log the error but continue with local logout — do not block the user.
      console.error('Backend logout request failed:', error.message);
    }

    // Step 2 & 3: Remove JWT from localStorage and clear AuthContext state.
    // localStorage.removeItem('token') is called inside logout() in AuthContext.
    logout();

    // Step 4: Redirect the user to the login page.
    navigate('/login');
  };

  const getUserInitial = () => {
    if (user?.name) return user.name.charAt(0).toUpperCase();
    return null;
  };

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center">
        {/* Logo */}
        <Link
          to="/home"
          className="flex items-center gap-3 cursor-pointer select-none focus:outline-none"
          title="Campus Marketplace"
          aria-label="Campus Marketplace Home"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
            style={{ backgroundColor: '#2F6B4F' }}
          >
            <ShoppingBag className="w-6 h-6 text-white" />
          </div>
          {/* Full text on desktop, short on mobile */}
          <span className="text-xl font-bold text-[#1E293B] hidden sm:inline">
            Campus Marketplace
          </span>
          <span className="text-xl font-bold text-[#1E293B] sm:hidden">
            CampusM
          </span>
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Desktop Right Section */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            onClick={() => navigate('/my-listings')}
            className={`relative p-2 rounded-lg transition ${
              location.pathname === '/my-listings'
                ? 'bg-[#2F6B4F]/5 text-[#2F6B4F]'
                : 'hover:bg-gray-50 text-[#64748B] hover:text-[#2F6B4F]'
            }`}
            title="My Listings"
          >
            <LayoutList className="w-5 h-5" />
          </button>

          <button
            className="saas-button-accent flex items-center gap-2"
            onClick={handleSellItem}
          >
            <Plus className="w-4 h-4" />
            Sell Item
          </button>

          <button
            onClick={() => navigate('/my-requests')}
            className={`relative p-2 rounded-lg transition ${
              location.pathname === '/my-requests'
                ? 'bg-[#2F6B4F]/5 text-[#2F6B4F]'
                : 'hover:bg-gray-50 text-[#64748B] hover:text-[#2F6B4F]'
            }`}
            title="My Requests"
            aria-label="My contact requests"
          >
            <Inbox className="w-5 h-5" />
          </button>

          <button
            className="relative p-2 rounded-lg hover:bg-gray-50 transition"
            onClick={handleWishlist}
          >
            <Heart className="w-5 h-5 text-[#64748B] hover:text-[#2F6B4F] transition" />
          </button>

          <button
            className={`relative p-2 rounded-lg transition ${
              location.pathname === '/notifications'
                ? 'bg-[#2F6B4F]/5 text-[#2F6B4F]'
                : 'hover:bg-gray-50 text-[#64748B] hover:text-[#2F6B4F]'
            }`}
            onClick={handleNotifications}
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {badgeCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-[#D97757] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm pointer-events-none">
                {badgeCount > 9 ? '9+' : badgeCount}
              </span>
            )}
          </button>

          {/* Profile Menu Dropdown */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              onClick={() => setProfileDropdownOpen((prev) => !prev)}
              className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-[#84A98C] transition"
              style={{ backgroundColor: '#2F6B4F' }}
              title="Profile menu"
              aria-label="Profile menu"
              aria-expanded={profileDropdownOpen}
            >
              {getUserInitial() ? (
                <span className="text-white text-sm font-semibold">
                  {getUserInitial()}
                </span>
              ) : (
                <User className="w-5 h-5 text-white" />
              )}
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-[#E2E8F0] rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2 border-b border-[#E2E8F0]">
                  <p className="text-sm font-bold text-[#1E293B] truncate">{user?.name || 'User'}</p>
                  <p className="text-xs text-[#64748B] truncate">{user?.email || ''}</p>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      navigate('/profile');
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[#1E293B] hover:bg-[#F8FAFC] hover:text-[#2F6B4F] transition text-left"
                  >
                    <User className="w-4 h-4 text-[#64748B]" />
                    <span>My Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      navigate('/my-listings');
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[#1E293B] hover:bg-[#F8FAFC] hover:text-[#2F6B4F] transition text-left font-medium"
                  >
                    <LayoutList className="w-4 h-4 text-[#2F6B4F]" />
                    <span>My Listings</span>
                  </button>

                  <button
                    onClick={() => {
                      navigate('/my-requests');
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[#1E293B] hover:bg-[#F8FAFC] hover:text-[#2F6B4F] transition text-left"
                  >
                    <Inbox className="w-4 h-4 text-[#64748B]" />
                    <span>My Requests</span>
                  </button>

                  <button
                    onClick={() => {
                      navigate('/wishlist');
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[#1E293B] hover:bg-[#F8FAFC] hover:text-[#2F6B4F] transition text-left"
                  >
                    <Heart className="w-4 h-4 text-[#64748B]" />
                    <span>Wishlist</span>
                  </button>
                </div>

                <div className="border-t border-[#E2E8F0] pt-1 mt-1">
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition text-left font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="sm:hidden p-2 rounded-lg hover:bg-gray-50 transition"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6 text-[#1E293B]" />
          ) : (
            <Menu className="w-6 h-6 text-[#1E293B]" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="sm:hidden bg-white border-b border-[#E2E8F0] shadow-lg"
          style={{
            animation: 'slideDown 0.2s ease-out',
          }}
        >
          <style>
            {`
              @keyframes slideDown {
                from { opacity: 0; transform: translateY(-8px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}
          </style>
          <div className="px-4 py-3 space-y-1">
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#1E293B] hover:bg-[#F8FAFC] transition text-left"
              onClick={() => {
                handleSellItem();
                setMobileMenuOpen(false);
              }}
            >
              <Plus className="w-5 h-5 text-[#D97757]" />
              <span className="font-medium">Sell Item</span>
            </button>

            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#1E293B] hover:bg-[#F8FAFC] transition text-left"
              onClick={() => {
                navigate('/my-listings');
                setMobileMenuOpen(false);
              }}
            >
              <LayoutList className="w-5 h-5 text-[#64748B]" />
              <span className="font-medium">My Listings</span>
            </button>

            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#1E293B] hover:bg-[#F8FAFC] transition text-left"
              onClick={() => {
                navigate('/my-requests');
                setMobileMenuOpen(false);
              }}
            >
              <Inbox className="w-5 h-5 text-[#64748B]" />
              <span className="font-medium">My Requests</span>
            </button>

            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#1E293B] hover:bg-[#F8FAFC] transition text-left"
              onClick={() => {
                handleWishlist();
                setMobileMenuOpen(false);
              }}
            >
              <Heart className="w-5 h-5 text-[#64748B]" />
              <span className="font-medium">Wishlist</span>
            </button>

            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#1E293B] hover:bg-[#F8FAFC] transition text-left"
              onClick={() => {
                handleNotifications();
                setMobileMenuOpen(false);
              }}
            >
              <div className="relative">
                <Bell className="w-5 h-5 text-[#64748B]" />
                {badgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-0.5 bg-[#D97757] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm pointer-events-none">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </div>
              <span className="font-medium">Notifications</span>
            </button>

            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#1E293B] hover:bg-[#F8FAFC] transition text-left"
              onClick={() => {
                navigate('/profile');
                setMobileMenuOpen(false);
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#2F6B4F' }}
              >
                {getUserInitial() ? (
                  <span className="text-white text-xs font-semibold">
                    {getUserInitial()}
                  </span>
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>
              <span className="font-medium text-[#1E293B]">
                {user?.name || 'Profile'}
              </span>
            </button>

            <div className="border-t border-[#E2E8F0] my-1" />

            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition text-left"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
