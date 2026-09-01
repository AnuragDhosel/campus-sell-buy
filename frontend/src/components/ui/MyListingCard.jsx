import React, { memo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Pencil, Trash2, ImageOff, Users } from 'lucide-react';
import api from '../../utils/api';
import BuyerRequestsModal from './BuyerRequestsModal';

const STATUS_STYLES = {
  available: 'bg-[#2F6B4F]/10 text-[#2F6B4F]',
  sold: 'bg-[#64748B]/10 text-[#64748B]',
  hidden: 'bg-[#D97757]/10 text-[#D97757]',
  action_required: 'bg-[#D97757]/10 text-[#D97757]',
  archived: 'bg-[#64748B]/10 text-[#64748B]',
};

const STATUS_LABELS = {
  available: 'Active',
  sold: 'Sold',
  hidden: 'Hidden',
  action_required: 'Action Required',
  archived: 'Archived',
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const MyListingCard = ({ item, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const hasImage = item.images && item.images.length > 0 && item.images[0].url;
  const imageCount = item.images?.length || 0;

  // Buyer Requests modal state
  const [showBuyerRequests, setShowBuyerRequests] = useState(false);
  const [requestCount, setRequestCount] = useState(null);

  // Fetch buyer request count on mount (background, silent)
  useEffect(() => {
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const res = await api.get('/api/handshakes/item/' + item._id + '/requests');
        if (!cancelled) {
          setRequestCount(res.data?.count ?? (res.data?.data?.length ?? 0));
        }
      } catch {
        // silently fail — count stays null
      }
    };
    if (item?._id) fetchCount();
    return () => { cancelled = true; };
  }, [item._id]);

  const handleCardClick = () => {
    if (item?._id) {
      navigate('/item/' + item._id);
    }
  };

  return (
    <>
      <article
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleCardClick();
        }}
        tabIndex={0}
        role="button"
        className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] hover:border-[#84A98C] transition-all duration-200 cursor-pointer group"
        aria-label={'Listing: ' + item.title}
      >
        <div className="flex flex-col sm:flex-row">
          {/* Image */}
          <div className="sm:w-48 w-full aspect-[4/3] sm:aspect-auto sm:min-h-[180px] overflow-hidden bg-[#F8FAFC] flex-shrink-0 relative">
            {hasImage ? (
              <img
                src={item.images[0].url}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center min-h-[120px]">
                <div className="w-14 h-14 rounded-2xl bg-[#E2E8F0] flex items-center justify-center">
                  <ImageOff className="w-6 h-6 text-[#64748B]" />
                </div>
              </div>
            )}
            {imageCount > 1 && (
              <span className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-md">
                1/{imageCount}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between">
            <div>
              {/* Category + Status */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="inline-block text-xs font-medium bg-[#84A98C]/10 text-[#2F6B4F] px-2 py-0.5 rounded-md">
                  {item.category}
                </span>
                <span
                  className={'inline-block text-xs font-medium px-2 py-0.5 rounded-md ' + (STATUS_STYLES[item.status] || 'bg-[#64748B]/10 text-[#64748B]')}
                >
                  {STATUS_LABELS[item.status] || item.status}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-[#1E293B] font-semibold text-base line-clamp-1 group-hover:text-[#2F6B4F] transition-colors">
                {item.title}
              </h3>

              {/* Price */}
              <p className="text-[#2F6B4F] font-bold text-lg mt-1">
                {'\u20b9'}{item.price?.toLocaleString('en-IN')}
              </p>

              {/* Meta Row */}
              <div className="flex items-center gap-4 mt-2 text-xs text-[#64748B]">
                {(item.collegeName || item.college) && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{item.collegeName || item.college}</span>
                  </div>
                )}
                {item.createdAt && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#E2E8F0] flex-wrap">
              {/* Edit */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(item);
                }}
                className="saas-button-secondary text-sm py-2 px-3 gap-1.5"
                aria-label={'Edit ' + item.title}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>

              {/* Delete */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(item);
                }}
                className="inline-flex items-center justify-center text-sm font-medium py-2 px-3 rounded-xl border border-[#E2E8F0] text-[#D97757] hover:bg-[#D97757]/5 hover:border-[#D97757]/30 transition gap-1.5"
                aria-label={'Delete ' + item.title}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>

              {/* Buyer Requests */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBuyerRequests(true);
                }}
                className="inline-flex items-center justify-center text-sm font-medium py-2 px-3 rounded-xl border border-[#E2E8F0] text-[#2F6B4F] hover:bg-[#2F6B4F]/5 hover:border-[#84A98C] transition gap-1.5"
                aria-label={'View buyer requests for ' + item.title}
              >
                <Users className="w-3.5 h-3.5" />
                Buyer Requests
                {requestCount !== null && requestCount > 0 && (
                  <span className="ml-1 min-w-[18px] h-[18px] px-1 bg-[#2F6B4F] text-white text-[10px] font-bold rounded-full inline-flex items-center justify-center">
                    {requestCount > 99 ? '99+' : requestCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* Buyer Requests Modal */}
      <BuyerRequestsModal
        isOpen={showBuyerRequests}
        onClose={() => setShowBuyerRequests(false)}
        item={item}
      />
    </>
  );
};

export default memo(MyListingCard);
