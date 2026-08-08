import React, { memo } from 'react';
import { Package, X, Check } from 'lucide-react';

const NotificationCard = memo(({ notification, onAccept, onDecline, isResponding }) => {
  const { buyerId, itemId, createdAt } = notification;
  const image = itemId?.images?.[0]?.url;

  return (
    <article className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] flex flex-col sm:flex-row">
      <div className="sm:w-24 w-full aspect-video sm:aspect-square bg-[#F8FAFC] flex items-center justify-center shrink-0">
        {image ? (
          <img src={image} alt={itemId?.title || 'Item image'} className="w-full h-full object-cover" />
        ) : (
          <Package className="w-8 h-8 text-[#84A98C]" />
        )}
      </div>
      
      <div className="flex-1 p-4 flex flex-col justify-center">
        <div className="self-start">
          <span className="text-xs font-medium bg-[#D97757]/10 text-[#D97757] px-2 py-0.5 rounded-md inline-block">
            Contact Request
          </span>
        </div>
        
        <div className="mt-2">
          <span className="text-[#1E293B] font-semibold text-sm mr-1">{buyerId?.name}</span>
          <span className="text-[#64748B] text-xs mr-1">wants to contact you about</span>
          <span className="text-[#2F6B4F] font-medium text-sm">{itemId?.title}</span>
        </div>
        
        <div className="text-xs text-[#64748B] mt-2">
          {new Date(createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })}
        </div>
        
        <div className="flex gap-2 mt-3 pt-3 border-t border-[#E2E8F0]">
          <button 
            type="button"
            onClick={() => onDecline(notification)}
            disabled={isResponding}
            className="saas-button-secondary text-sm py-2 px-4 flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Decline
          </button>
          <button 
            type="button"
            onClick={() => onAccept(notification)}
            disabled={isResponding}
            className="saas-button-primary text-sm py-2 px-4 flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Accept
          </button>
        </div>
      </div>
    </article>
  );
});

export default NotificationCard;
