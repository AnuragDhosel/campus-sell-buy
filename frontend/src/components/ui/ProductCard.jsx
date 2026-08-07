import React, { useState } from 'react';
import { Heart, MapPin, Package } from 'lucide-react';

const conditionStyles = {
  'New': 'bg-[#2F6B4F]/10 text-[#2F6B4F]',
  'Like New': 'bg-[#84A98C]/10 text-[#84A98C]',
  'Good': 'bg-[#D97757]/10 text-[#D97757]',
  'Fair': 'bg-[#64748B]/10 text-[#64748B]',
};

const ProductCard = ({ item }) => {
  const [wishlisted, setWishlisted] = useState(false);

  const hasImage = item.images && item.images.length > 0 && item.images[0].url;

  const handleWishlistToggle = (e) => {
    e.stopPropagation();
    setWishlisted((prev) => !prev);
  };

  return (
    <div
      className="saas-card overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-1"
      style={{ transform: undefined }}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[#F8FAFC]">
        {hasImage ? (
          <img
            src={item.images[0].url}
            alt={item.title}
            className="object-cover w-full h-full transition-transform duration-300 hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-[#64748B]/40" />
          </div>
        )}

        {/* Wishlist Heart */}
        <button
          onClick={handleWishlistToggle}
          className="absolute top-3 right-3 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-sm transition-colors duration-200"
          aria-label="Toggle wishlist"
        >
          <Heart
            className={`w-4 h-4 transition-colors duration-200 ${
              wishlisted ? 'text-red-500 fill-red-500' : 'text-[#64748B]'
            }`}
          />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Row 1: Category & Condition */}
        <div className="flex items-center justify-between">
          <span className="inline-block text-xs font-medium bg-[#84A98C]/10 text-[#2F6B4F] px-2 py-0.5 rounded-md">
            {item.category}
          </span>
          {item.condition && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                conditionStyles[item.condition] || 'bg-[#64748B]/10 text-[#64748B]'
              }`}
            >
              {item.condition}
            </span>
          )}
        </div>

        {/* Row 2: Title */}
        <h3 className="text-[#1E293B] font-semibold text-sm line-clamp-1 mt-2">
          {item.title}
        </h3>

        {/* Row 3: Price */}
        <p className="text-[#2F6B4F] font-bold text-lg mt-1">
          ₹{item.price?.toLocaleString('en-IN')}
        </p>

        {/* Row 4: College */}
        {(item.collegeName || item.college) && (
          <div className="flex items-center gap-1 mt-2 text-xs text-[#64748B]">
            <MapPin className="w-3 h-3" />
            <span>{item.collegeName || item.college}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
