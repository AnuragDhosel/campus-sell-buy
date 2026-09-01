import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, X, Check, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';

const NotificationCard = memo(({ notification, onAccept, onDecline, isResponding }) => {
  const navigate = useNavigate();
  const { buyerId, itemId, status, createdAt } = notification;
  const image = itemId?.images?.[0]?.url;
  const targetItemId = itemId?._id || itemId;

  const handleItemClick = () => {
    if (targetItemId && typeof targetItemId === 'string') {
      navigate(`/item/${targetItemId}`);
    } else if (targetItemId?._id) {
      navigate(`/item/${targetItemId._id}`);
    }
  };

  // If this is a buyer notification (e.g., approved or declined request)
  if (status === 'approved' || status === 'declined') {
    const isApproved = status === 'approved';

    return (
      <article
        onClick={handleItemClick}
        className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] flex flex-col sm:flex-row cursor-pointer hover:border-[#84A98C] transition group"
      >
        <div className="sm:w-24 w-full aspect-video sm:aspect-square bg-[#F8FAFC] flex items-center justify-center shrink-0">
          {image ? (
            <img src={image} alt={itemId?.title || 'Item image'} className="w-full h-full object-cover" />
          ) : (
            <Package className="w-8 h-8 text-[#84A98C]" />
          )}
        </div>

        <div className="flex-1 p-4 flex flex-col justify-center">
          <div className="self-start">
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                isApproved ? 'bg-[#2F6B4F]/10 text-[#2F6B4F]' : 'bg-red-50 text-red-600'
              }`}
            >
              {isApproved ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {isApproved ? 'Contact Request Accepted' : 'Request Declined'}
            </span>
          </div>

          <div className="mt-2">
            <span className="text-[#64748B] text-xs">Your contact request for </span>
            <span className="text-[#1E293B] font-semibold text-sm">{itemId?.title || 'Item'}</span>
            <span className="text-[#64748B] text-xs"> has been {isApproved ? 'accepted' : 'declined'}.</span>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E2E8F0]">
            <span className="text-xs text-[#64748B]">
              {new Date(createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>

            <span className="text-xs font-medium text-[#2F6B4F] flex items-center gap-1 group-hover:underline">
              View Item <ExternalLink className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </article>
    );
  }

  // Normal Seller Pending Notification
  return (
    <article className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] flex flex-col sm:flex-row">
      <div
        onClick={handleItemClick}
        className="sm:w-24 w-full aspect-video sm:aspect-square bg-[#F8FAFC] flex items-center justify-center shrink-0 cursor-pointer"
      >
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

        <div className="mt-2 cursor-pointer" onClick={handleItemClick}>
          <span className="text-[#1E293B] font-semibold text-sm mr-1">{buyerId?.name}</span>
          <span className="text-[#64748B] text-xs mr-1">wants to contact you about</span>
          <span className="text-[#2F6B4F] font-medium text-sm hover:underline">{itemId?.title}</span>
        </div>

        <div className="text-xs text-[#64748B] mt-2">
          {new Date(createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
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
