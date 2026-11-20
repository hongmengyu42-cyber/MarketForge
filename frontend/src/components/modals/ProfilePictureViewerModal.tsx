import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, Download, Camera, RotateCcw, Maximize2, User as UserIcon } from 'lucide-react';
import { getInitials } from '@/utils';

interface ProfilePictureViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string | null;
  userName?: string;
  userRole?: string;
  isOwnProfile?: boolean;
  onEditAvatar?: () => void;
}

export default function ProfilePictureViewerModal({
  isOpen,
  onClose,
  imageUrl,
  userName = 'User',
  userRole,
  isOwnProfile = false,
  onEditAvatar,
}: ProfilePictureViewerModalProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [isCircleMask, setIsCircleMask] = useState<boolean>(true);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialPan, setInitialPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Reset zoom and pan on open
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Mouse drag handlers for panning when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPan({ ...pan });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setPan({
      x: initialPan.x + dx,
      y: initialPan.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setZoom((prev) => Math.min(3.5, Math.max(1, Number((prev + delta).toFixed(2)))));
    if (zoom <= 1) {
      setPan({ x: 0, y: 0 });
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${userName.toLowerCase().replace(/\s+/g, '_')}_profile.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] w-screen h-screen bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 select-none animate-in fade-in duration-200 overflow-hidden"
    >
      {/* Top Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl mx-auto flex items-center justify-between text-white z-10 py-2"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm">
            {getInitials(userName)}
          </div>
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              {userName}
              {userRole && (
                <span className="text-[11px] font-semibold bg-white/20 text-white/90 px-2 py-0.5 rounded-full">
                  {userRole}
                </span>
              )}
            </h3>
            <p className="text-xs text-white/60">Profile Picture</p>
          </div>
        </div>

        {/* Action Controls in Header */}
        <div className="flex items-center gap-2">
          {imageUrl && (
            <>
              <button
                type="button"
                onClick={() => setIsCircleMask(!isCircleMask)}
                className={`p-2 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1.5 ${
                  isCircleMask
                    ? 'bg-white/20 text-white hover:bg-white/30'
                    : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                }`}
                title="Toggle circle avatar view vs full photo"
              >
                <Maximize2 size={16} />
                <span className="hidden sm:inline">{isCircleMask ? 'Circle' : 'Full'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                title="Download picture"
              >
                <Download size={18} />
              </button>
            </>
          )}

          {isOwnProfile && onEditAvatar && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditAvatar();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-md"
            >
              <Camera size={14} />
              <span>Change Photo</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors ml-2"
            title="Close viewer"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Picture Display Area */}
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="flex-1 flex items-center justify-center overflow-hidden my-auto w-full"
      >
        {imageUrl ? (
          <div
            className={`transition-all duration-200 overflow-hidden flex items-center justify-center shrink-0 ${
              isCircleMask
                ? 'w-72 h-72 sm:w-96 sm:h-96 rounded-full ring-4 ring-white/30 shadow-2xl bg-black/40'
                : 'max-w-2xl max-h-[70vh] rounded-2xl shadow-2xl bg-black/40'
            } ${zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'}`}
            onClick={() => {
              if (zoom === 1) setZoom(2);
              else {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }
            }}
          >
            <img
              src={imageUrl}
              alt={userName}
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transition: isDragging ? 'none' : 'transform 150ms ease-out',
              }}
              className="w-full h-full object-cover select-none pointer-events-none"
              draggable={false}
            />
          </div>
        ) : (
          <div className="w-72 h-72 sm:w-96 sm:h-96 shrink-0 rounded-full ring-4 ring-white/30 shadow-2xl bg-gradient-to-br from-primary-600 to-indigo-700 flex flex-col items-center justify-center text-white">
            <UserIcon size={72} className="opacity-40 mb-2" />
            <span className="text-6xl font-black">{getInitials(userName)}</span>
            <p className="text-sm font-medium text-white/70 mt-3">No custom photo uploaded</p>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm mx-auto flex items-center justify-center gap-3 z-10 py-2"
      >
        {imageUrl && (
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-4 text-white text-xs border border-white/10 shadow-lg">
            <button
              type="button"
              disabled={zoom <= 1}
              onClick={() => {
                setZoom((z) => Math.max(1, Number((z - 0.25).toFixed(2))));
                if (zoom <= 1.25) setPan({ x: 0, y: 0 });
              }}
              className="p-1 hover:text-primary-300 disabled:opacity-30 disabled:hover:text-white transition-colors"
              title="Zoom out"
            >
              <ZoomOut size={16} />
            </button>
            <span className="font-mono text-white/90 text-xs w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              disabled={zoom >= 3.5}
              onClick={() => setZoom((z) => Math.min(3.5, Number((z + 0.25).toFixed(2))))}
              className="p-1 hover:text-primary-300 disabled:opacity-30 disabled:hover:text-white transition-colors"
              title="Zoom in"
            >
              <ZoomIn size={16} />
            </button>

            {zoom > 1 && (
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                className="p-1 text-white/70 hover:text-white transition-colors border-l border-white/20 pl-3 flex items-center gap-1"
                title="Reset zoom"
              >
                <RotateCcw size={13} />
                <span className="text-[11px]">Reset</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
