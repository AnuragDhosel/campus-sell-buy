import React, { memo } from 'react';

const MyListingCardSkeleton = () => {
  return (
    <div
      className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]"
      role="status"
      aria-label="Loading listing"
    >
      <div className="flex flex-col sm:flex-row">
        {/* Image Placeholder */}
        <div className="sm:w-48 w-full aspect-[4/3] sm:aspect-auto sm:min-h-[180px] bg-[#E2E8F0] animate-shimmer flex-shrink-0" />

        {/* Content Placeholder */}
        <div className="flex-1 p-4 sm:p-5">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-16 h-5 rounded-md bg-[#E2E8F0] animate-shimmer" />
            <div className="w-14 h-5 rounded-md bg-[#E2E8F0] animate-shimmer" />
          </div>

          {/* Title */}
          <div className="h-5 w-3/4 rounded bg-[#E2E8F0] animate-shimmer" />

          {/* Price */}
          <div className="h-6 w-1/4 mt-2 rounded bg-[#E2E8F0] animate-shimmer" />

          {/* Meta */}
          <div className="flex items-center gap-4 mt-3">
            <div className="h-3 w-24 rounded bg-[#E2E8F0] animate-shimmer" />
            <div className="h-3 w-20 rounded bg-[#E2E8F0] animate-shimmer" />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#E2E8F0]">
            <div className="h-9 w-16 rounded-xl bg-[#E2E8F0] animate-shimmer" />
            <div className="h-9 w-20 rounded-xl bg-[#E2E8F0] animate-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(MyListingCardSkeleton);
