import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import api from '../../utils/api';

const CollegeDropdown = ({ selectedCollege, onCollegeChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);

  // Fetch distinct college names from the backend on mount
  useEffect(() => {
    let cancelled = false;
    const fetchColleges = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/items/colleges');
        if (!cancelled) {
          setColleges(res.data?.data || []);
        }
      } catch {
        // silently fail - dropdown still works with empty list
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchColleges();
    return () => { cancelled = true; };
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayLabel = selectedCollege || 'All Colleges';

  const handleSelect = (collegeName) => {
    onCollegeChange(collegeName === 'All Colleges' ? '' : collegeName);
    setIsOpen(false);
  };

  const isSelected = (collegeName) => {
    if (collegeName === 'All Colleges') return !selectedCollege || selectedCollege === '';
    return selectedCollege === collegeName;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        className="saas-button-secondary gap-2"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#64748B]" />
        ) : null}
        <span className="truncate max-w-[140px]">{displayLabel}</span>
        <ChevronDown
          className={'w-4 h-4 transition-transform duration-200 ' + (isOpen ? 'rotate-180' : '')}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute z-50 bg-white border border-[#E2E8F0] rounded-xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] p-1 mt-1 min-w-[220px] max-h-64 overflow-y-auto"
          role="listbox"
          aria-label="Select college"
        >
          {/* All Colleges option */}
          <div
            onClick={() => handleSelect('All Colleges')}
            className={'flex items-center justify-between px-3 py-2 rounded-lg text-sm transition cursor-pointer ' +
              (isSelected('All Colleges')
                ? 'bg-[#2F6B4F]/5 text-[#2F6B4F] font-medium'
                : 'hover:bg-[#F8FAFC]'
              )
            }
            role="option"
            aria-selected={isSelected('All Colleges')}
          >
            <span>All Colleges</span>
          </div>

          {/* Separator */}
          {colleges.length > 0 && (
            <div className="border-t border-[#E2E8F0] my-1" />
          )}

          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-[#64748B]" />
            </div>
          ) : colleges.length === 0 ? (
            <div className="px-3 py-2 text-sm text-[#64748B]">No colleges found</div>
          ) : (
            colleges.map(({ collegeName, count }) => (
              <div
                key={collegeName}
                onClick={() => handleSelect(collegeName)}
                className={'flex items-center justify-between px-3 py-2 rounded-lg text-sm transition cursor-pointer ' +
                  (isSelected(collegeName)
                    ? 'bg-[#2F6B4F]/5 text-[#2F6B4F] font-medium'
                    : 'hover:bg-[#F8FAFC]'
                  )
                }
                role="option"
                aria-selected={isSelected(collegeName)}
              >
                <span className="truncate">{collegeName}</span>
                <span className="text-xs text-[#64748B] ml-2 shrink-0">{count}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CollegeDropdown;
