import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, X, Check, ExternalLink, CheckCircle2, XCircle, AlertTriangle, Clock, Trash2, RefreshCw, CheckCheck, Archive } from 'lucide-react';

const NotificationCard = memo(({ notification, onAccept, onDecline, onRenew, onDeleteExpired, isResponding, isDeleting }) => {
  const navigate = useNavigate();
  const { buyerId, itemId, status, createdAt, updatedAt } = notification;
  const image = itemId?.images?.[0]?.url;

  // Extract actual Item ID associated with the handshake
  const rawItemId = itemId?._id || (typeof itemId === 'string' ? itemId : (notification.itemId?._id || notification.itemId));
  const targetItemId = typeof rawItemId === 'object' ? rawItemId?._id || rawItemId?.toString?.() : String(rawItemId);

  const handleItemClick = (e) => {
    e?.stopPropagation?.();
    if (targetItemId && targetItemId !== 'undefined' && targetItemId !== 'null') {
      navigate(`/item/${targetItemId}`);
    }
  };

  const displayDate = createdAt || updatedAt;

  // ── Expiry Notification (Listing reached 30 days — action_required) ──────
  if (notification.type === 'expiry') {
    const itemTitle = itemId?.title || 'your listing';

    return (
      <article className="bg-white border border-amber-200 rounded-2xl overflow-hidden shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] flex flex-col sm:flex-row">
        {/* Item image */}
        <div className="sm:w-24 w-full aspect-video sm:aspect-square bg-[#F8FAFC] flex items-center justify-center shrink-0">
          {image ? (
            <img src={image} alt={itemTitle} className="w-full h-full object-cover" />
          ) : (
            <Package className="w-8 h-8 text-[#84A98C]" />
          )}
        </div>

        <div className="flex-1 p-4 flex flex-col justify-center">
          {/* Badge */}
          <div className="self-start">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="w-3 h-3" />
              Action Required
            </span>
          </div>

          {/* Message */}
          <p className="mt-2 text-sm text-[#1E293B]">
            Your item{' '}
            <span className="font-semibold text-[#2F6B4F]">{itemTitle}</span>
            {' '}requires your attention.
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Renew this listing within 7 days, or it will be automatically removed.
          </p>

          {/* Date */}
          <div className="text-xs text-[#64748B] mt-1">
            {new Date(displayDate).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-[#E2E8F0] flex-wrap">
            <button
              type="button"
              onClick={() => onRenew && onRenew(notification)}
              disabled={isResponding || isDeleting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#2F6B4F] text-white hover:bg-[#245539] disabled:opacity-50 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {isResponding ? 'Renewing…' : 'Renew My Listing'}
            </button>
            <button
              type="button"
              onClick={() => onDeleteExpired && onDeleteExpired(notification)}
              disabled={isResponding || isDeleting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isDeleting ? 'Deleting…' : 'Delete My Listing'}
            </button>
          </div>
        </div>
      </article>
    );
  }

  // ── Deleted Notification (seller or cron deleted a listing — history) ──────
  if (notification.type === 'deleted') {
    const itemTitle = notification.itemTitle || itemId?.title || 'your listing';
    return (
      <article className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] flex flex-col sm:flex-row">
        <div className="sm:w-24 w-full aspect-video sm:aspect-square bg-[#F8FAFC] flex items-center justify-center shrink-0">
          <Trash2 className="w-8 h-8 text-[#64748B]" />
        </div>
        <div className="flex-1 p-4 flex flex-col justify-center">
          <div className="self-start">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 bg-red-50 text-red-600 border border-red-200">
              <Trash2 className="w-3 h-3" />
              Listing Deleted
            </span>
          </div>
          <p className="mt-2 text-sm text-[#1E293B]">
            Your item{' '}
            <span className="font-semibold text-[#1E293B]">{itemTitle}</span>
            {' '}has been deleted.
          </p>
          <div className="text-xs text-[#64748B] mt-1">
            {new Date(displayDate).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </div>
        </div>
      </article>
    );
  }

  // ── Archived Notification (cron auto-archived after 7-day no-response) ──────
  if (notification.type === 'archived') {
    const itemTitle = notification.itemTitle || itemId?.title || 'your listing';
    return (
      <article className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] flex flex-col sm:flex-row">
        <div className="sm:w-24 w-full aspect-video sm:aspect-square bg-[#F8FAFC] flex items-center justify-center shrink-0">
          <Archive className="w-8 h-8 text-[#64748B]" />
        </div>
        <div className="flex-1 p-4 flex flex-col justify-center">
          <div className="self-start">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 bg-[#64748B]/10 text-[#64748B] border border-[#E2E8F0]">
              <Archive className="w-3 h-3" />
              Listing Removed
            </span>
          </div>
          <p className="mt-2 text-sm text-[#1E293B]">
            Your item{' '}
            <span className="font-semibold text-[#1E293B]">{itemTitle}</span>
            {' '}was removed because no action was taken within 7 days.
          </p>
          <div className="text-xs text-[#64748B] mt-1">
            {new Date(displayDate).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </div>
        </div>
      </article>
    );
  }

  // ── Renewed Notification (seller renewed — history record) ──────────────────
  if (notification.type === 'renewed') {
    const itemTitle = notification.itemTitle || itemId?.title || 'your listing';
    return (
      <article className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] flex flex-col sm:flex-row">
        <div className="sm:w-24 w-full aspect-video sm:aspect-square bg-[#F8FAFC] flex items-center justify-center shrink-0">
          <CheckCheck className="w-8 h-8 text-[#2F6B4F]" />
        </div>
        <div className="flex-1 p-4 flex flex-col justify-center">
          <div className="self-start">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 bg-[#2F6B4F]/10 text-[#2F6B4F] border border-[#84A98C]/30">
              <CheckCheck className="w-3 h-3" />
              Listing Renewed
            </span>
          </div>
          <p className="mt-2 text-sm text-[#1E293B]">
            Your item{' '}
            <span className="font-semibold text-[#2F6B4F]">{itemTitle}</span>
            {' '}has been renewed and is now visible in the marketplace again.
          </p>
          <div className="text-xs text-[#64748B] mt-1">
            {new Date(displayDate).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </div>
        </div>
      </article>
    );
  }

  // If this is a report notification
  if (notification.type === 'report' || status === 'report') {
    const isBlocked = notification.isBlocked || notification.remainingReports === 0;
    const buyerName = buyerId?.name || 'A buyer';
    const itemTitle = itemId?.title || 'your item';
    const remaining = notification.remainingReports;

    return (
      <article
        onClick={handleItemClick}
        onKeyDown={(e) => { if (e.key === 'Enter') handleItemClick(e); }}
        tabIndex={0}
        role="button"
        aria-label={`Notification: ${notification.message || `${buyerName} reported your item: ${itemTitle}`}`}
        className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] flex flex-col sm:flex-row cursor-pointer hover:border-[#D97757] transition group"
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
                isBlocked ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              {isBlocked ? 'Item Blocked' : 'Item Reported'}
            </span>
          </div>

          <div className="mt-2 text-sm">
            <span className="text-[#1E293B] font-semibold">{buyerName}</span>
            <span className="text-[#64748B]"> reported your item: </span>
            <span className="text-[#2F6B4F] font-semibold">{itemTitle}</span>
            <span className="text-[#64748B]">. </span>
            <span className={isBlocked ? 'text-red-600 font-medium' : 'text-[#D97757] font-medium'}>
              {remaining > 0
                ? `${remaining} more report${remaining === 1 ? '' : 's'} before this item is blocked.`
                : 'This item has reached 5 reports and is now blocked.'}
            </span>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E2E8F0]">
            <span className="text-xs text-[#64748B]">
              {new Date(displayDate).toLocaleDateString('en-IN', {
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

  // If this is a buyer notification (e.g., approved or declined request)
  if (status === 'approved' || status === 'declined') {
    const isApproved = status === 'approved';

    return (
      <article
        onClick={handleItemClick}
        onKeyDown={(e) => { if (e.key === 'Enter') handleItemClick(e); }}
        tabIndex={0}
        role="button"
        aria-label={`Notification: Your contact request for ${itemId?.title || 'Item'} has been ${isApproved ? 'accepted' : 'declined'} by the seller`}
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
            <span className="text-[#64748B] text-xs"> has been {isApproved ? 'accepted' : 'declined'} by the seller.</span>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E2E8F0]">
            <span className="text-xs text-[#64748B]">
              {new Date(displayDate).toLocaleDateString('en-IN', {
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
        onKeyDown={(e) => { if (e.key === 'Enter') handleItemClick(e); }}
        tabIndex={0}
        role="button"
        aria-label={`View ${itemId?.title || 'item'}`}
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

        <div 
          className="mt-2 cursor-pointer group" 
          onClick={handleItemClick}
          onKeyDown={(e) => { if (e.key === 'Enter') handleItemClick(e); }}
          tabIndex={0}
          role="button"
        >
          <span className="text-[#1E293B] font-semibold text-sm mr-1">{buyerId?.name || 'Buyer'}</span>
          <span className="text-[#64748B] text-xs mr-1">wants to contact you about</span>
          <span className="text-[#2F6B4F] font-medium text-sm group-hover:underline">{itemId?.title || 'your item'}</span>
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

