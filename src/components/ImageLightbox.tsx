'use client';

import { useEffect, useCallback } from 'react';

interface LightboxProps {
  src: string;
  alt?: string;
  type?: 'image' | 'video';
  onClose: () => void;
}

export default function ImageLightbox({ src, alt, type = 'image', onClose }: LightboxProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(8,8,16,0.92)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
        style={{ background: 'rgba(255,255,255,0.1)' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Media */}
      <div
        className="max-w-[90vw] max-h-[90vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {type === 'video' ? (
          <video
            src={src}
            controls
            autoPlay
            className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl"
          />
        ) : (
          <img
            src={src}
            alt={alt || 'Full size preview'}
            className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl object-contain"
          />
        )}

        {alt && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent rounded-b-lg">
            <p className="text-[13px] text-white/80">{alt}</p>
          </div>
        )}
      </div>
    </div>
  );
}
