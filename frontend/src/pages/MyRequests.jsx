import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Phone,
  MapPin,
  ExternalLink,
  Package,
  Inbox,
  Loader2,
} from 'lucide-react';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import EmptyState from '../components/ui/EmptyState';

const RequestSkeleton = () => (
  <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm animate-pulse space-y-4">
    <div className="flex justify-between items-start">
      <div className="w-32 h-6 bg-[#F8FAFC] rounded-lg" />
      <div className="w-24 h-5 bg-[#F8FAFC] rounded-full" />
    </div>
    <div className="flex gap-4 items-center">
      <div className="w-20 h-20 bg-[#F8FAFC] rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="w-3/4 h-5 bg-[#F8FAFC] rounded" />
        <div className="w-1/4 h-4 bg-[#F8FAFC] rounded" />
        <div className="w-1/2 h-4 bg-[#F8FAFC] rounded" />
      </div>
    </div>
    <div className="w-full h-10 bg-[#F8FAFC] rounded-xl" />
  </div>
);

const MyRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/handshakes/my-requests');
      setRequests(response.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch my requests:', err);
      setError(err.response?.data?.message || 'Unable to load your requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
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
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1E293B]">My Requests</h1>
            <p className="text-[#64748B] text-sm mt-0.5">
              Contact requests you have sent to sellers
            </p>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4" aria-busy="true" aria-label="Loading requests">
            {Array.from({ length: 3 }).map((_, index) => (
              <RequestSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={Inbox}
            title="Unable to load your requests"
            description={error}
            actionLabel="Try Again"
            onAction={fetchRequests}
          />
        ) : requests.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No Contact Requests Yet"
            description="When you request a seller's contact information, your requests will appear here."
            actionLabel="Browse Marketplace"
            onAction={() => navigate('/home')}
          />
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              const item = request.itemId || {};
              const image = item.images?.[0]?.url;
              const sellerName = request.sellerId?.name || item.sellerName;
              const phone = request.contact?.phoneNumber || request.contact?.sellerPhoneNumber || item.sellerPhoneNumber || item.phoneNumber;
              const room = request.contact?.roomNumber || item.roomNumber;
              const hostel = request.contact?.hostelName || item.hostelName;

              return (
                <article
                  key={request._id}
                  className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] transition hover:border-[#84A98C]/40"
                >
                  {/* Top Bar: Status Badge + Date */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-[#E2E8F0]">
                    {request.status === 'pending' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#84A98C]/15 text-[#2F6B4F] px-3 py-1 rounded-full">
                        <Clock className="w-3.5 h-3.5" />
                        Pending Seller Approval
                      </span>
                    )}

                    {request.status === 'approved' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#2F6B4F]/10 text-[#2F6B4F] px-3 py-1 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Contact Approved
                      </span>
                    )}

                    {request.status === 'declined' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-red-50 text-red-600 px-3 py-1 rounded-full">
                        <XCircle className="w-3.5 h-3.5" />
                        Request Declined
                      </span>
                    )}

                    <span className="text-xs text-[#64748B]">
                      Requested on{' '}
                      {new Date(request.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Main Item Row */}
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="w-20 h-20 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                      {image ? (
                        <img
                          src={image}
                          alt={item.title || 'Item'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-8 h-8 text-[#84A98C]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#1E293B] text-base truncate">
                        {item.title || 'Item Details'}
                      </h3>
                      <div className="text-sm font-bold text-[#2F6B4F] mt-0.5">
                        ₹{item.price ? Number(item.price).toLocaleString('en-IN') : 0}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748B] mt-2">
                        {item.category && (
                          <span className="bg-[#F8FAFC] px-2 py-0.5 rounded border border-[#E2E8F0]">
                            {item.category}
                          </span>
                        )}
                        {item.collegeName && (
                          <span>{item.collegeName}</span>
                        )}
                        {hostel && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#84A98C]" />
                            {hostel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Approved Contact Details Box (ONLY FOR APPROVED REQUESTS) */}
                  {request.status === 'approved' && (
                    <div className="mt-4 p-4 rounded-xl bg-[#2F6B4F]/5 border border-[#2F6B4F]/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#2F6B4F] uppercase tracking-wider">
                          Seller Contact Details
                        </span>
                        {phone && (
                          <a
                            href={`tel:${phone}`}
                            onClick={() => {
                              if (navigator.clipboard && phone) {
                                navigator.clipboard.writeText(phone).then(() => {
                                  toast.success(`Copied phone number (${phone}) to clipboard!`);
                                }).catch(() => {});
                              }
                            }}
                            className="saas-button-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            Call Seller
                          </a>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#1E293B] pt-1">
                        {sellerName && (
                          <div>
                            <span className="text-[#64748B]">Seller: </span>
                            <span className="font-semibold">{sellerName}</span>
                          </div>
                        )}

                        <div>
                          <span className="text-[#64748B]">Hostel: </span>
                          <span className="font-semibold">{hostel || 'N/A'}</span>
                        </div>

                        {room && (
                          <div>
                            <span className="text-[#64748B]">Room Number: </span>
                            <span className="font-semibold">{room}</span>
                          </div>
                        )}

                        {phone && (
                          <div>
                            <span className="text-[#64748B]">Phone Number: </span>
                            <span className="font-semibold">{phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Card Footer Actions */}
                  <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex justify-end">
                    <button
                      type="button"
                      onClick={() => navigate(`/item/${item._id || request.itemId}`)}
                      className="saas-button-secondary text-xs py-2 px-4 flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Item
                    </button>
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

export default MyRequests;
