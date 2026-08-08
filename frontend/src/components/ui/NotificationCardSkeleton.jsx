import React, { memo } from 'react';

const NotificationCardSkeleton = memo(() => {
  return (
    <article 
      role="status" 
      aria-label="Loading notification"
      className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] flex flex-col sm:flex-row"
    >
      <div className="sm:w-24 w-full aspect-video sm:aspect-square bg-[#E2E8F0] animate-shimmer shrink-0"></div>
      
      <div className="flex-1 p-4 flex flex-col justify-center">
        <div className="w-24 h-5 bg-[#E2E8F0] animate-shimmer rounded-md"></div>
        
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="w-20 h-4 bg-[#E2E8F0] animate-shimmer rounded"></div>
          <div className="w-32 h-3 bg-[#E2E8F0] animate-shimmer rounded"></div>
          <div className="w-24 h-4 bg-[#E2E8F0] animate-shimmer rounded"></div>
        </div>
        
        <div className="w-24 h-3 bg-[#E2E8F0] animate-shimmer rounded mt-3"></div>
        
        <div className="flex gap-2 mt-3 pt-3 border-t border-[#E2E8F0]">
          <div className="w-[100px] h-9 bg-[#E2E8F0] animate-shimmer rounded-lg"></div>
          <div className="w-[100px] h-9 bg-[#E2E8F0] animate-shimmer rounded-lg"></div>
        </div>
      </div>
      <span className="sr-only">Loading...</span>
    </article>
  );
});

export default NotificationCardSkeleton;
