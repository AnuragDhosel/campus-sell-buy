import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import ProductCard from '../components/ui/ProductCard';
import ProductCardSkeleton from '../components/ui/ProductCardSkeleton';
import EmptyState from '../components/ui/EmptyState';
import CategoryDropdown from '../components/ui/CategoryDropdown';
import { Search, Package } from 'lucide-react';

const Marketplace = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [totalItems, setTotalItems] = useState(0);
  const [error, setError] = useState(null);

  const searchTimeoutRef = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {};

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }
      if (selectedCategory) {
        params.category = selectedCategory;
      }

      const response = await api.get('/api/items', { params });
      const resData = response.data;

      // Backend returns: { success: true, count: N, data: [...] }
      setItems(resData.data || []);
      setTotalItems(resData.count || 0);
    } catch (err) {
      console.error('Failed to fetch items:', err);
      setError(
        err.response?.data?.message ||
          'Failed to load items. Please try again later.'
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedCategory]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      {/* Marketplace Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1E293B]">
          Campus Marketplace
        </h1>
        <p className="text-[#64748B] mt-1 text-sm sm:text-base">
          {!loading && !error
            ? `Discover ${totalItems} items from students across campus`
            : 'Discover items from students across campus'}
        </p>
      </div>

      {/* Filters Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative sm:max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none w-5 h-5 text-[#64748B]" />
            <input
              type="text"
              className="saas-input saas-input-with-icon w-full"
              placeholder="Search items..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>

          {/* Category Dropdown */}
          <CategoryDropdown
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
          />
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={Package}
            title="Something went wrong"
            description={error}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No items found"
            description="Be the first student to list an item on the marketplace."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <ProductCard key={item._id || item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
