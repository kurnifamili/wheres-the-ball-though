import React, { useState, useRef, useEffect } from 'react';

const DRAG_THRESHOLD = 5; // Minimum distance in pixels to consider a drag vs click

interface ZoomableImageProps {
  src: string;
  alt: string;
  onLoad: () => void;
  onClick: (xPercent: number, yPercent: number) => void;
  isLoading: boolean;
  isClickable: boolean;
}

const ZoomableImage: React.FC<ZoomableImageProps> = ({ 
  src, 
  alt, 
  onLoad, 
  onClick, 
  isLoading,
  isClickable 
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragDistance, setDragDistance] = useState(0);
  const [minScale, setMinScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const handleImageLoad = () => {
    // Calculate minimum scale when image loads
    const newMinScale = calculateMinScale();
    setMinScale(newMinScale);
    setScale(newMinScale); // Set initial scale to fit image
    onLoad(); // Call the original onLoad
  };
  const calculateMinScale = () => {
    if (!containerRef.current || !imageRef.current) return 1;
    
    const container = containerRef.current;
    const image = imageRef.current;
    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imageWidth = image.naturalWidth;
    const imageHeight = image.naturalHeight;
    
    // Calculate scale needed to fit image in container
    const scaleX = containerWidth / imageWidth;
    const scaleY = containerHeight / imageHeight;
    
    // Use the smaller scale to ensure image fits completely
    return Math.min(scaleX, scaleY);
  };

  // Wheel handler moved to useEffect to fix passive event listener warning

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click only
      setIsDragging(true);
      setDragDistance(0);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Calculate distance moved
      const distance = Math.sqrt(
        Math.pow(newX - position.x, 2) + Math.pow(newY - position.y, 2)
      );
      setDragDistance(prev => prev + distance);
      
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const wasActuallyDragging = dragDistance > DRAG_THRESHOLD;
    
    setIsDragging(false);
    
    // If we moved more than threshold, it was a drag, not a click
    if (wasActuallyDragging) {
      e.stopPropagation();
      return;
    }
    
    // Otherwise, treat as a click
    if (isClickable && containerRef.current && imageRef.current) {
      // Calculate click position as percentage of actual image
      const img = imageRef.current;
      
      // Account for zoom and pan to get position on actual image
      const imgRect = img.getBoundingClientRect();
      const relativeX = (e.clientX - imgRect.left) / imgRect.width;
      const relativeY = (e.clientY - imgRect.top) / imgRect.height;
      
      // Check if click is within bounds
      if (relativeX >= 0 && relativeX <= 1 && relativeY >= 0 && relativeY <= 1) {
        onClick(relativeX, relativeY);
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setDragStart({
        x: touch.clientX - position.x,
        y: touch.clientY - position.y
      });
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const resetZoom = () => {
    setScale(minScale);
    setPosition({ x: 0, y: 0 });
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.5, 4));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.5, minScale));
  };

  useEffect(() => {
    // Reset on new image
    resetZoom();
  }, [src]);

  useEffect(() => {
    // Calculate minimum scale when image loads
    const image = imageRef.current;
    if (image && image.complete) {
      const newMinScale = calculateMinScale();
      setMinScale(newMinScale);
      setScale(newMinScale); // Set initial scale to fit image
    }
  }, [src]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY * -0.001;
      const newScale = Math.min(Math.max(minScale, scale + delta), 4);
      setScale(newScale);
    };
    
    container.addEventListener('wheel', wheelHandler, { passive: false });
    return () => container.removeEventListener('wheel', wheelHandler);
  }, [scale, minScale]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className={`w-full h-full overflow-hidden ${isDragging && dragDistance > DRAG_THRESHOLD ? 'cursor-grabbing' : isClickable ? 'cursor-pointer' : 'cursor-default'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsDragging(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          onLoad={handleImageLoad}
          className={`w-full h-auto select-none ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
          draggable={false}
        />
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 bg-white/90 rounded-lg shadow-lg p-2">
        <button
          onClick={zoomIn}
          className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 active:scale-95 transition-all"
          title="Zoom In"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
          </svg>
        </button>
        <button
          onClick={zoomOut}
          className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 active:scale-95 transition-all"
          title="Zoom Out"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
          </svg>
        </button>
        <button
          onClick={resetZoom}
          className="bg-gray-600 text-white p-2 rounded hover:bg-gray-700 active:scale-95 transition-all"
          title="Reset View"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <div className="text-xs text-center text-gray-600 mt-1">
          {Math.round(scale * 100)}%
        </div>
      </div>
    </div>
  );
};

export default ZoomableImage;

