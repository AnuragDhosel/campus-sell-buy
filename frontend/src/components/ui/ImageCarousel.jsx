import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';

const ImageCarousel = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : prev));
  }, [images?.length]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevious, handleNext]);

  if (!images || images.length === 0) {
    return (
      <div className="aspect-[4/3] sm:aspect-[16/10] overflow-hidden rounded-2xl bg-[#F8FAFC] flex items-center justify-center">
        <Package className="w-16 h-16 text-[#E2E8F0]" />
      </div>
    );
  }

  return (
    <div className="relative group">
      <div className="aspect-[4/3] sm:aspect-[16/10] overflow-hidden rounded-2xl bg-[#F8FAFC]">
        <img
          src={images[currentIndex].url}
          alt={`Product image ${currentIndex + 1}`}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80';
          }}
          className="object-contain w-full h-full"
        />
      </div>

      {images.length > 1 && currentIndex > 0 && (
        <button
          onClick={handlePrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full shadow-sm flex items-center justify-center z-10 hover:bg-white transition"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-5 h-5 text-[#1E293B]" />
        </button>
      )}

      {images.length > 1 && currentIndex < images.length - 1 && (
        <button
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full shadow-sm flex items-center justify-center z-10 hover:bg-white transition"
          aria-label="Next image"
        >
          <ChevronRight className="w-5 h-5 text-[#1E293B]" />
        </button>
      )}

      {images.length > 1 && (
        <div className="flex gap-2 justify-center mt-4">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-[#2F6B4F]' : 'bg-[#E2E8F0]'
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageCarousel;
