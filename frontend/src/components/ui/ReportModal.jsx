import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

const ReportModal = ({ isOpen, onClose, onConfirm, isLoading }) => {
  const cancelRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      setTimeout(() => {
        cancelRef.current?.focus();
      }, 0);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
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
        aria-labelledby="report-modal-title"
      >
        <div className="flex flex-col items-center text-center">
          <AlertTriangle className="w-12 h-12 text-[#D97757] mb-4" />
          <h2 id="report-modal-title" className="text-lg font-semibold text-[#1E293B]">
            Report this listing?
          </h2>
          <p className="text-sm text-[#64748B] mt-2">
            This listing will be reviewed by our team. False reports may result in restrictions.
          </p>
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
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 inline-flex items-center justify-center bg-[#D97757] text-white font-medium py-3 px-4 rounded-xl hover:bg-[#C56648] transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Report'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
