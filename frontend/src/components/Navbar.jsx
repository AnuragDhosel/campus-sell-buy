import React, { useState, useEffect, useRef, useContext } from 'react';
import { ShoppingBag, Plus, Heart, Bell, User, Menu, X, LogOut } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);

  // Close mobile menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  // Close mobile menu on Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileMenuOpen]);

  const handleSellItem = () => {
    console.log('Sell Item clicked');
  };

  const handleWishlist = () => {
    console.log('Wishlist clicked');
  };

  const handleNotifications = () => {
    console.log('Notifications clicked');
  };

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
  };

  const getUserInitial = () => {
    if (user?.name) return user.name.charAt(0).toUpperCase();
    return null;
  };

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center">
        {/* Logo */}
        <div className="flex items-center gap-3">
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
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Desktop Right Section */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            className="saas-button-accent flex items-center gap-2"
            onClick={handleSellItem}
          >
            <Plus className="w-4 h-4" />
            Sell Item
          </button>

          <button
            className="relative p-2 rounded-lg hover:bg-gray-50 transition"
            onClick={handleWishlist}
          >
            <Heart className="w-5 h-5 text-[#64748B] hover:text-[#2F6B4F] transition" />
          </button>

          <button
            className="relative p-2 rounded-lg hover:bg-gray-50 transition"
            onClick={handleNotifications}
          >
            <Bell className="w-5 h-5 text-[#64748B] hover:text-[#2F6B4F] transition" />
          </button>

          <div
            className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
            style={{ backgroundColor: '#2F6B4F' }}
          >
            {getUserInitial() ? (
              <span className="text-white text-sm font-semibold">
                {getUserInitial()}
              </span>
            ) : (
              <User className="w-5 h-5 text-white" />
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
              <Bell className="w-5 h-5 text-[#64748B]" />
              <span className="font-medium">Notifications</span>
            </button>

            <div className="flex items-center gap-3 px-3 py-2.5">
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
            </div>

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
