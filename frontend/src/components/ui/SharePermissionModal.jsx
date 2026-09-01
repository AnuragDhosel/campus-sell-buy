import React, { useState, useEffect, useRef } from 'react';
import { Shield, Loader2 } from 'lucide-react';

const SharePermissionModal = ({ isOpen, onClose, onConfirm, isLoading, buyerName = 'buyer' }) => {
  const [shareHostel, setShareHostel] = useState(false);
  const [shareMobile, setShareMobile] = useState(false);
  const cancelRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setShareHostel(false);
      setShareMobile(false);
      setTimeout(() => {
        cancelRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm({ shareHostel, shareMobile });
  };

  return (
    <div 
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        <div className="flex flex-col items-center text-center">
          <Shield className="w-12 h-12 text-[#2F6B4F] mb-4" />
          <h2 id="share-modal-title" className="text-lg font-semibold text-[#1E293B]">
            Share Contact Information
          </h2>
          <p className="text-sm text-[#64748B] mt-1 mb-6">
            Choose what information to share with {buyerName}
          </p>
        </div>

        <div className="space-y-3">
          <label 
            className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
              shareHostel ? 'border-[#2F6B4F] bg-[#2F6B4F]/5' : 'border-[#E2E8F0] hover:border-[#84A98C]'
            }`}
          >
            <input 
              type="checkbox"
              checked={shareHostel}
              onChange={(e) => setShareHostel(e.target.checked)}
              className="w-5 h-5 accent-[#2F6B4F] mt-0.5"
            />
            <div>
              <div className="text-sm font-medium text-[#1E293B]">Room Number</div>
              <div className="text-xs text-[#64748B]">Share your hostel room number</div>
            </div>
          </label>

          <label 
            className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
              shareMobile ? 'border-[#2F6B4F] bg-[#2F6B4F]/5' : 'border-[#E2E8F0] hover:border-[#84A98C]'
            }`}
          >
            <input 
              type="checkbox"
              checked={shareMobile}
              onChange={(e) => setShareMobile(e.target.checked)}
              className="w-5 h-5 accent-[#2F6B4F] mt-0.5"
            />
            <div>
              <div className="text-sm font-medium text-[#1E293B]">Mobile Number</div>
              <div className="text-xs text-[#64748B]">Share your phone number</div>
            </div>
          </label>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            ref={cancelRef}
            onClick={onClose}
            className="saas-button-secondary flex-1"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="saas-button-primary flex-1 flex items-center justify-center"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm & Share'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SharePermissionModal;
