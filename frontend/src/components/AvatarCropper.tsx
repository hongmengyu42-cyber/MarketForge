import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCw, RotateCcw, RefreshCcw, Move, Crop } from 'lucide-react';

interface AvatarCropperProps {
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob, croppedUrl: string) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

const VIEWPORT_SIZE = 300;
const CROP_SIZE = 240; // The circular crop zone diameter
const OUTPUT_SIZE = 512; // High-resolution output

export default function AvatarCropper({
  imageSrc,
  onCropComplete,
  onCancel,
  isSaving = false,
}: AvatarCropperProps) {
  const [zoom, setZoom] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialPan, setInitialPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');

  // Pre-load the image object
  useEffect(() => {
    setImageLoaded(false);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      setZoom(1.0);
      setRotation(0);
      setPan({ x: 0, y: 0 });
    };
  }, [imageSrc]);

  // Generate cropped preview onto canvas
  const generateCroppedCanvas = useCallback((): HTMLCanvasElement | null => {
    if (!imageRef.current || !imageLoaded) return null;

    const img = imageRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.imageSmoothingQuality = 'high';
    ctx.imageSmoothingEnabled = true;

    const factor = OUTPUT_SIZE / CROP_SIZE;

    // Clear
    ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    // Save state
    ctx.save();

    // Move to center of canvas
    ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);

    // Apply translation (pan) scaled to output size
    ctx.translate(pan.x * factor, pan.y * factor);

    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // Base dimensions fitting into CROP_SIZE
    const aspect = img.naturalWidth / img.naturalHeight;
    let baseW = CROP_SIZE;
    let baseH = CROP_SIZE;

    if (aspect > 1) {
      baseH = CROP_SIZE;
      baseW = CROP_SIZE * aspect;
    } else {
      baseW = CROP_SIZE;
      baseH = CROP_SIZE / aspect;
    }

    const drawW = baseW * factor * zoom;
    const drawH = baseH * factor * zoom;

    // Draw centered
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

    ctx.restore();

    return canvas;
  }, [imageLoaded, pan, rotation, zoom]);

  // Update small live preview whenever transforms change
  useEffect(() => {
    if (!imageLoaded) return;
    const timer = setTimeout(() => {
      const canvas = generateCroppedCanvas();
      if (canvas) {
        setPreviewDataUrl(canvas.toDataURL('image/png'));
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [generateCroppedCanvas, imageLoaded]);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
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

  // Touch drag handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setInitialPan({ ...pan });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStart.x;
    const dy = e.touches[0].clientY - dragStart.y;
    setPan({
      x: initialPan.x + dx,
      y: initialPan.y + dy,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((prev) => Math.min(3.0, Math.max(0.6, Number((prev + delta).toFixed(2)))));
  };

  // Rotate handlers
  const rotateLeft = () => setRotation((r) => (r - 90 + 360) % 360);
  const rotateRight = () => setRotation((r) => (r + 90) % 360);
  const resetAll = () => {
    setZoom(1.0);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // Perform Final Crop
  const handleConfirmCrop = () => {
    const canvas = generateCroppedCanvas();
    if (!canvas) return;

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          onCropComplete(blob, url);
        }
      },
      'image/png',
      0.95
    );
  };

  // Calculate transform style for displayed image
  const getImageTransform = () => {
    if (!imageRef.current || !imageLoaded) return {};
    const aspect = imageRef.current.naturalWidth / imageRef.current.naturalHeight;
    let baseW = CROP_SIZE;
    let baseH = CROP_SIZE;

    if (aspect > 1) {
      baseH = CROP_SIZE;
      baseW = CROP_SIZE * aspect;
    } else {
      baseW = CROP_SIZE;
      baseH = CROP_SIZE / aspect;
    }

    return {
      width: `${baseW * zoom}px`,
      height: `${baseH * zoom}px`,
      transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg)`,
      transformOrigin: 'center center',
      userSelect: 'none' as const,
      pointerEvents: 'none' as const,
    };
  };

  return (
    <div className="flex flex-col items-center space-y-5 animate-in fade-in duration-200">
      {/* Interactive Crop Viewport */}
      <div className="relative flex flex-col items-center">
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          style={{ width: `${VIEWPORT_SIZE}px`, height: `${VIEWPORT_SIZE}px` }}
          className="relative bg-gray-900 rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing select-none shadow-inner flex items-center justify-center border border-gray-700"
        >
          {/* Active Image Layer */}
          {imageLoaded && (
            <img
              src={imageSrc}
              alt="Crop target"
              style={getImageTransform()}
              className="absolute max-w-none transition-transform duration-75 ease-out"
              draggable={false}
            />
          )}

          {/* Mask Overlay: Darkened area with a clear circular cutout */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at center, transparent ${CROP_SIZE / 2}px, rgba(0, 0, 0, 0.65) ${CROP_SIZE / 2 + 1}px)`,
            }}
          />

          {/* Circular Crop Guide Border */}
          <div
            className="absolute rounded-full border-2 border-white/80 pointer-events-none shadow-[0_0_0_1px_rgba(0,0,0,0.3)]"
            style={{
              width: `${CROP_SIZE}px`,
              height: `${CROP_SIZE}px`,
            }}
          >
            {/* Rule of thirds grid inside circle */}
            <div className="w-full h-full relative opacity-30">
              <div className="absolute top-1/3 left-0 right-0 h-[1px] bg-white border-dashed border-t border-white" />
              <div className="absolute top-2/3 left-0 right-0 h-[1px] bg-white border-dashed border-t border-white" />
              <div className="absolute left-1/3 top-0 bottom-0 w-[1px] bg-white border-dashed border-l border-white" />
              <div className="absolute left-2/3 top-0 bottom-0 w-[1px] bg-white border-dashed border-l border-white" />
            </div>
          </div>

          {/* Pan hint badge */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white/90 text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm pointer-events-none font-medium">
            <Move size={11} /> Drag to reposition
          </div>
        </div>

        {/* Small live result preview */}
        {previewDataUrl && (
          <div className="absolute -right-3 sm:-right-8 top-2 flex flex-col items-center">
            <div className="w-14 h-14 rounded-full ring-2 ring-primary-500 shadow-lg overflow-hidden bg-white">
              <img src={previewDataUrl} alt="Preview" className="w-full h-full object-cover" />
            </div>
            <span className="text-[10px] font-semibold text-gray-500 mt-1">Preview</span>
          </div>
        )}
      </div>

      {/* Editing Controls: Zoom & Rotate */}
      <div className="w-full max-w-sm space-y-3.5 bg-gray-50 p-4 rounded-2xl border border-gray-200">
        {/* Zoom Slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
            <span className="flex items-center gap-1 text-gray-600">
              <ZoomIn size={14} /> Zoom
            </span>
            <span className="text-gray-500 font-mono text-[11px]">{Math.round(zoom * 100)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(2))))}
              className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
              title="Zoom out"
            >
              <ZoomOut size={16} />
            </button>
            <input
              type="range"
              min={0.6}
              max={3.0}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full accent-primary-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3.0, Number((z + 0.1).toFixed(2))))}
              className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
              title="Zoom in"
            >
              <ZoomIn size={16} />
            </button>
          </div>
        </div>

        {/* Rotate and Reset Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={rotateLeft}
              className="btn-secondary btn-sm !py-1 !px-2.5 flex items-center gap-1 text-xs"
              title="Rotate 90 degrees counter-clockwise"
            >
              <RotateCcw size={13} /> -90°
            </button>
            <button
              type="button"
              onClick={rotateRight}
              className="btn-secondary btn-sm !py-1 !px-2.5 flex items-center gap-1 text-xs"
              title="Rotate 90 degrees clockwise"
            >
              <RotateCw size={13} /> +90°
            </button>
          </div>

          <button
            type="button"
            onClick={resetAll}
            className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 p-1 hover:bg-gray-200/60 rounded transition-colors"
            title="Reset position and zoom"
          >
            <RefreshCcw size={12} /> Reset
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 w-full max-w-sm pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="btn-secondary btn-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirmCrop}
          disabled={!imageLoaded || isSaving}
          className="btn-primary btn-sm flex items-center gap-1.5 shadow-sm"
        >
          {isSaving ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Crop size={15} />
              Crop & Apply Photo
            </>
          )}
        </button>
      </div>
    </div>
  );
}
