import React from 'react';

const ProductCardSkeleton = () => {
  return (
    <div className="saas-card overflow-hidden">
      {/* Image Placeholder */}
      <div className="aspect-[4/3] bg-[#E2E8F0] rounded-t-2xl animate-shimmer" />

      {/* Content Area */}
      <div className="p-4">
        {/* Category & Condition Placeholders */}
        <div className="flex items-center gap-2">
          <div className="w-16 h-5 rounded bg-[#E2E8F0] animate-shimmer" />
          <div className="w-14 h-5 rounded bg-[#E2E8F0] animate-shimmer" />
        </div>

        {/* Title Placeholder */}
        <div className="h-4 w-3/4 mt-2 rounded bg-[#E2E8F0] animate-shimmer" />

        {/* Price Placeholder */}
        <div className="h-6 w-1/3 mt-2 rounded bg-[#E2E8F0] animate-shimmer" />

        {/* College Placeholder */}
        <div className="h-3 w-1/2 mt-2 rounded bg-[#E2E8F0] animate-shimmer" />
      </div>
    </div>
  );
};

export default ProductCardSkeleton;
