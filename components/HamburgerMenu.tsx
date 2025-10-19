import React from 'react';
import ToggleSwitch from './ToggleSwitch';

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  useNewImage: boolean;
  onUseNewImageChange: (useNew: boolean) => void;
  onDetectPosition: () => void;
  onToggleImageManager: () => void;
  onManualPinpoint: () => void;
  isManualPinpointMode: boolean;
  savedImagesCount: number;
  isDetecting: boolean;
  imageUrl: string | null;
  isLoading: boolean;
  onButtonClick?: () => void;
}

const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  isOpen,
  onClose,
  useNewImage,
  onUseNewImageChange,
  onDetectPosition,
  onToggleImageManager,
  onManualPinpoint,
  isManualPinpointMode,
  savedImagesCount,
  isDetecting,
  imageUrl,
  isLoading,
  onButtonClick
}) => {
  const handleButtonClick = (callback: () => void) => {
    onButtonClick?.();
    callback();
  };
  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => {
          onButtonClick?.();
          onClose();
        }}
        className="fixed top-4 left-4 bg-white/95 backdrop-blur p-3 rounded-lg shadow-lg hover:bg-gray-100 active:scale-95 transition-all duration-200 z-40"
        aria-label="Open menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Slide-out Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          
          {/* Menu Panel */}
          <div className="fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">Game Controls</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Menu Content */}
            <div className="p-4 space-y-4">
              {/* Generate New Image Toggle */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <ToggleSwitch 
                  checked={useNewImage}
                  onChange={onUseNewImageChange}
                  label="Generate New Image"
                />
              </div>
              
              {/* Detect Ball Position Button */}
              <button
                onClick={() => handleButtonClick(onDetectPosition)}
                disabled={!imageUrl || isDetecting || isLoading}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-white shadow-lg transition-all duration-200 ${
                  !imageUrl || isDetecting || isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                }`}
              >
                {isDetecting ? 'Detecting...' : '🔍 Detect Ball Position'}
              </button>
              
              {/* Manual Pinpoint Button */}
              <button
                onClick={() => handleButtonClick(onManualPinpoint)}
                disabled={!imageUrl || isLoading}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-white shadow-lg transition-all duration-200 ${
                  !imageUrl || isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : isManualPinpointMode
                    ? 'bg-red-600 hover:bg-red-700 active:scale-95'
                    : 'bg-orange-600 hover:bg-orange-700 active:scale-95'
                }`}
              >
                {isManualPinpointMode ? '📍 Click to Pinpoint Ball' : '📍 Manual Pinpoint'}
              </button>
              
              {/* Manage Images Button */}
              <button
                onClick={() => handleButtonClick(onToggleImageManager)}
                className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-purple-600 hover:bg-purple-700 active:scale-95 shadow-lg transition-all duration-200"
              >
                📁 Manage Images ({savedImagesCount})
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default HamburgerMenu;
