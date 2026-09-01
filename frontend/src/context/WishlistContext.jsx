/**
 * @file context/WishlistContext.jsx
 * @description React Context for client-side wishlist management.
 *
 * Architecture:
 *   - No backend wishlist API exists — this is 100% client-side.
 *   - Wishlist items are stored in localStorage under key 'wishlist'.
 *   - Full item objects are stored (id, title, price, category, images, collegeName, status)
 *     so the Wishlist page can render cards without extra API calls.
 *   - All components (ProductCard, ProductDetails, Wishlist page) share the same context.
 *   - On logout, wishlist is cleared (handled in AuthContext).
 */

import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from './AuthContext';

export const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const { isAuthenticated } = useContext(AuthContext);
  const [wishlist, setWishlist] = useState([]);

  // Load wishlist from localStorage on mount
  useEffect(() => {
    if (isAuthenticated) {
      try {
        const stored = localStorage.getItem('wishlist');
        if (stored) {
          setWishlist(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to parse wishlist from localStorage:', e);
        localStorage.removeItem('wishlist');
      }
    } else {
      // Clear wishlist state when logged out
      setWishlist([]);
    }
  }, [isAuthenticated]);

  // Persist to localStorage whenever wishlist changes
  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('wishlist', JSON.stringify(wishlist));
    }
  }, [wishlist, isAuthenticated]);

  /**
   * Add an item to the wishlist.
   * Stores only the fields needed for rendering the Wishlist page card.
   */
  const addToWishlist = useCallback((item) => {
    if (!item?._id) return;
    setWishlist((prev) => {
      // Don't add duplicates
      if (prev.some((w) => w._id === item._id)) return prev;
      return [
        ...prev,
        {
          _id: item._id,
          title: item.title,
          price: item.price,
          category: item.category,
          collegeName: item.collegeName,
          status: item.status,
          images: item.images?.slice(0, 1) || [], // Only store first image
        },
      ];
    });
  }, []);

  /**
   * Remove an item from the wishlist by its _id.
   */
  const removeFromWishlist = useCallback((itemId) => {
    setWishlist((prev) => prev.filter((w) => w._id !== itemId));
  }, []);

  /**
   * Toggle an item in the wishlist.
   * Returns true if item was added, false if removed.
   */
  const toggleWishlist = useCallback((item) => {
    if (!item?._id) return false;
    const exists = wishlist.some((w) => w._id === item._id);
    if (exists) {
      removeFromWishlist(item._id);
      return false;
    } else {
      addToWishlist(item);
      return true;
    }
  }, [wishlist, addToWishlist, removeFromWishlist]);

  /**
   * Check if an item is in the wishlist.
   */
  const isInWishlist = useCallback(
    (itemId) => wishlist.some((w) => w._id === itemId),
    [wishlist]
  );

  /**
   * Clear the entire wishlist.
   */
  const clearWishlist = useCallback(() => {
    setWishlist([]);
    localStorage.removeItem('wishlist');
  }, []);

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        isInWishlist,
        clearWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};
