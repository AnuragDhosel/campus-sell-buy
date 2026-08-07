import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

const categories = ['All', 'Books', 'Electronics', 'Furniture', 'Clothing', 'Stationery', 'Sports', 'Other'];

const CategoryDropdown = ({ selectedCategory, onCategoryChange, itemCounts }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const displayLabel = selectedCategory || 'All';

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (category) => {
    const value = category === 'All' ? '' : category;

    // If itemCounts provided and count is 0, don't allow selection
    if (category !== 'All' && itemCounts && itemCounts[category] === 0) {
      return;
    }

    onCategoryChange(value);
    setIsOpen(false);
  };

  const isSelected = (category) => {
    if (category === 'All') return !selectedCategory || selectedCategory === '';
    return selectedCategory === category;
  };

  const isDisabled = (category) => {
    return category !== 'All' && itemCounts && itemCounts[category] === 0;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        className="saas-button-secondary gap-2"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span>{displayLabel}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 bg-white border border-[#E2E8F0] rounded-xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] p-1 mt-1 min-w-[200px]">
          {categories.map((category) => {
            const selected = isSelected(category);
            const disabled = isDisabled(category);

            return (
              <div
                key={category}
                onClick={() => !disabled && handleSelect(category)}
                className={`
                  flex items-center justify-between px-3 py-2 rounded-lg text-sm transition
                  ${disabled
                    ? 'text-[#64748B]/40 cursor-not-allowed'
                    : selected
                      ? 'bg-[#2F6B4F]/5 text-[#2F6B4F] font-medium cursor-pointer'
                      : 'cursor-pointer hover:bg-[#F8FAFC]'
                  }
                `}
              >
                <span>{category}</span>
                {category !== 'All' && itemCounts && itemCounts[category] !== undefined && (
                  <span className="text-xs text-[#64748B]">
                    {itemCounts[category]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CategoryDropdown;
