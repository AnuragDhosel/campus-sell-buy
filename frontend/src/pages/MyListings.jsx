import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Plus, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import MyListingCard from '../components/ui/MyListingCard';
import MyListingCardSkeleton from '../components/ui/MyListingCardSkeleton';
import EmptyState from '../components/ui/EmptyState';
import { AuthContext } from '../context/AuthContext';

const MyListings = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMyItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Backend GET /api/items returns all available items with seller populated
      // We filter client-side to get only the current user's items
      const response = await api.get('/api/items');
      const allItems = response.data?.data || [];

      const myItems = allItems.filter((item) => {
        const sellerId =
          typeof item.seller === 'object' ? item.seller._id : item.seller;
        return sellerId === user?.id;
      });

      setItems(myItems);
    } catch (err) {
      console.error('Failed to fetch listings:', err);
      setError(
        err.response?.data?.message ||
          'Failed to load your listings. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchMyItems();
    }
  }, [user?.id, fetchMyItems]);

  const handleEdit = useCallback((item) => {
    // Placeholder — backend PUT /api/items/:id not yet implemented
    toast('Edit functionality coming soon!', { icon: '🛠️' });
  }, []);

  const handleDelete = useCallback((item) => {
    // Placeholder — backend DELETE /api/items/:id not yet implemented
    toast('Delete functionality coming soon!', { icon: '🛠️' });
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/home')}
              className="w-10 h-10 rounded-xl border border-[#E2E8F0] flex items-center justify-center hover:bg-white transition"
              aria-label="Back to marketplace"
            >
              <ArrowLeft className="w-5 h-5 text-[#64748B]" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1E293B]">My Listings</h1>
              <p className="text-[#64748B] text-sm mt-0.5">
                {!loading && !error
                  ? `${items.length} item${items.length !== 1 ? 's' : ''} listed`
                  : 'Manage your marketplace listings'}
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/sell')}
            className="saas-button-accent gap-2 hidden sm:inline-flex"
          >
            <Plus className="w-4 h-4" />
            Sell Item
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4" aria-busy="true" aria-label="Loading listings">
            {Array.from({ length: 3 }).map((_, index) => (
              <MyListingCardSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={Package}
            title="Something went wrong"
            description={error}
            actionLabel="Try Again"
            onAction={fetchMyItems}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="You haven't listed anything yet"
            description="Start selling to students on campus. Your listings will appear here."
            actionLabel="Sell Your First Item"
            onAction={() => navigate('/sell')}
          />
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <MyListingCard
                key={item._id}
                item={item}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Mobile FAB */}
        {!loading && items.length > 0 && (
          <button
            onClick={() => navigate('/sell')}
            className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-[#D97757] hover:bg-[#C56648] active:scale-95 text-white rounded-2xl shadow-lg flex items-center justify-center transition-all duration-200 z-30"
            aria-label="Sell new item"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}
      </main>
    </div>
  );
};

export default MyListings;
