/**
 * @file pages/Wishlist.jsx
 * @description Wishlist page — displays items the user has saved.
 *
 * Features:
 *  - Responsive grid of wishlisted items
 *  - Each card: image, title, price, category, college, status overlay, remove, navigate
 *  - Sold/archived items show grey overlay but remain in wishlist
 *  - Empty state with "Browse Marketplace" CTA
 *  - Uses WishlistContext (localStorage-backed)
 */

import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Heart,
  Trash2,
  MapPin,
  Tag,
  Package,
  ShoppingBag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import EmptyState from '../components/ui/EmptyState';
import { WishlistContext } from '../context/WishlistContext';

const Wishlist = () => {
  const navigate = useNavigate();
  const { wishlist, removeFromWishlist } = useContext(WishlistContext);

  const formatPrice = (price) => `₹${Number(price).toLocaleString('en-IN')}`;

  const isItemActive = (status) => status === 'available';

  const statusLabel = (status) => {
    if (status === 'sold') return 'Sold Out';
    if (status === 'archived') return 'Unavailable';
    if (status === 'hidden') return 'Under Review';
    return null;
  };

  const handleRemove = (item) => {
    removeFromWishlist(item._id);
    toast('Removed from wishlist', { icon: '💔' });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
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
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1E293B]">
              Wishlist
            </h1>
            <p className="text-[#64748B] text-sm mt-0.5">
              {wishlist.length === 0
                ? 'Items you save will appear here'
                : `${wishlist.length} saved item${wishlist.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {/* Content */}
        {wishlist.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Your wishlist is empty"
            description="Save items you are interested in and find them here later."
            actionLabel="Browse Marketplace"
            onAction={() => navigate('/home')}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlist.map((item) => {
              const active = isItemActive(item.status);
              const label = statusLabel(item.status);
              const imageUrl = item.images?.[0]?.url;

              return (
                <article
                  key={item._id}
                  className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] flex flex-col group"
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#F8FAFC]">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={item.title}
                        className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                          !active ? 'opacity-50 grayscale' : ''
                        }`}
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-[#E2E8F0]" />
                      </div>
                    )}

                    {/* Status overlay */}
                    {label && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <span className="bg-white/90 text-[#64748B] text-sm font-semibold px-4 py-1.5 rounded-lg">
                          {label}
                        </span>
                      </div>
                    )}

                    {/* Remove button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(item);
                      }}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-sm transition"
                      aria-label={`Remove ${item.title} from wishlist`}
                    >
                      <Trash2 className="w-4 h-4 text-[#D97757]" />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-4 flex-1 flex flex-col">
                    {/* Category */}
                    {item.category && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-[#84A98C]/10 text-[#2F6B4F] px-2 py-0.5 rounded-md w-fit mb-2">
                        <Tag className="w-2.5 h-2.5" />
                        {item.category}
                      </span>
                    )}

                    {/* Title */}
                    <h3 className="text-sm font-semibold text-[#1E293B] line-clamp-2 mb-1">
                      {item.title}
                    </h3>

                    {/* Price */}
                    <p className="text-[#2F6B4F] font-bold text-lg mb-2">
                      {formatPrice(item.price)}
                    </p>

                    {/* College */}
                    {item.collegeName && (
                      <div className="flex items-center gap-1 text-xs text-[#64748B] mb-3">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{item.collegeName}</span>
                      </div>
                    )}

                    {/* Action */}
                    <div className="mt-auto pt-3 border-t border-[#E2E8F0]">
                      {active ? (
                        <button
                          onClick={() => navigate(`/item/${item._id}`)}
                          className="w-full saas-button-primary text-sm py-2 gap-1.5"
                        >
                          <ShoppingBag className="w-4 h-4" />
                          View Details
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/item/${item._id}`)}
                          className="w-full saas-button-secondary text-sm py-2 gap-1.5 opacity-70"
                        >
                          <Package className="w-4 h-4" />
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Wishlist;
