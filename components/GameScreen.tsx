import React, { useState } from 'react';
import type { GameState, BoundingBox } from '../types';
import Leaderboard from './Leaderboard';
import { ExpandIcon, ContractIcon } from './icons';
import LoadingState from './LoadingState';
import DebugLog from './DebugLog';
import ImageManager from './ImageManager';
import ZoomableImage from './ZoomableImage';
import HamburgerMenu from './HamburgerMenu';

interface GameScreenProps {
  gameState: GameState;
  statusBarText: string;
  isFullScreen: boolean;
  imageUrl: string | null;
  isLoading: boolean;
  isWaitingForLocation: boolean;
  isTransitioning: boolean;
  loadingQuote: string;
  useNewImage: boolean;
  hasApiError: boolean;
  roundCompleted: boolean;
  isDetecting: boolean;
  isBackgroundDetecting: boolean;
  savedImages: Array<{url: string, answerPosition: BoundingBox}>;
  showImageManager: boolean;
  logs: string[];
  timeRemaining: number;
  roomPin: string | null;
  isMultiplayer: boolean;
  gameStarted: boolean;
  recentScorer: string | null;
  showNotification: boolean;
  countdown: number | null;
  currentRound: number;
  totalRounds: number;
  gameCompleted: boolean;
  onUseNewImageChange: (useNew: boolean) => void;
  onImageClick: (xPercent: number, yPercent: number) => void;
  onImageLoad: () => void;
  onToggleFullScreen: () => void;
  onNextRound: () => void;
  onDetectPosition: () => void;
  onToggleImageManager: () => void;
  onDeleteImage: (url: string) => void;
  onManualPinpoint: () => void;
  isManualPinpointMode: boolean;
  onResetGame: () => void;
  onButtonClick?: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({ 
    gameState, 
    statusBarText, 
    isFullScreen,
    imageUrl,
    isLoading,
    isWaitingForLocation,
    isTransitioning,
    loadingQuote,
    useNewImage,
    hasApiError,
    roundCompleted,
    isDetecting,
    isBackgroundDetecting,
    savedImages,
    showImageManager,
    logs,
    timeRemaining,
    roomPin,
    isMultiplayer,
    gameStarted,
    recentScorer,
    showNotification,
    countdown,
    currentRound,
    totalRounds,
    gameCompleted,
    onUseNewImageChange,
    onImageClick, 
    onImageLoad,
    onToggleFullScreen,
    onNextRound,
    onDetectPosition,
    onToggleImageManager,
    onDeleteImage,
    onManualPinpoint,
    isManualPinpointMode,
    onResetGame,
    onButtonClick
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <>
      {/* Only show game container when there's content */}
      {(imageUrl || isLoading || isWaitingForLocation || gameState.roundActive || hasApiError || isBackgroundDetecting) && (
        <div id="game-container" className="fixed inset-0 bg-transparent">
          {/* Round Number Display */}
          {gameState.roundActive && !gameCompleted && (
            <div className="absolute top-16 left-4 z-20 bg-black/80 text-white px-4 py-2 rounded-lg">
              <div className="text-lg font-bold">
                Round {currentRound} of {totalRounds}
              </div>
            </div>
          )}
          
          {/* Game Completed Overlay */}
          {gameCompleted && (
            <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
                <h2 className="text-3xl font-bold text-gray-800 mb-4">Game Completed!</h2>
                <p className="text-lg text-gray-600 mb-6">
                  You've completed all {totalRounds} rounds!
                </p>
                
                {/* Leaderboard */}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-700 mb-3">Final Scores</h3>
                  <Leaderboard 
                    players={gameState.players}
                    isMultiplayer={isMultiplayer}
                    recentScorer={recentScorer}
                    showNotification={showNotification}
                  />
                </div>
                
                {/* Play Again Button */}
                <button
                  onClick={() => {
                    onButtonClick?.();
                    onResetGame();
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  Play Again
                </button>
              </div>
            </div>
          )}
          
          {/* Fullscreen Image Container */}
          <div 
            id="image-container"
            className={`relative w-full h-full overflow-hidden ${imageUrl ? 'bg-gray-900' : 'bg-transparent'} ${(gameState.roundActive || hasApiError || isBackgroundDetecting) ? 'border-4 border-[#ed2939]' : ''} ${isTransitioning ? 'opacity-50' : ''}`}
          >
            {isLoading && <LoadingState quote={loadingQuote} />}
            {imageUrl && (
              <ZoomableImage
                src={imageUrl}
                alt="Where's the ball in this image, though?"
                onLoad={onImageLoad}
                onClick={onImageClick}
                isLoading={isLoading}
                isClickable={!isTransitioning && (gameState.roundActive || hasApiError || isBackgroundDetecting)}
              />
            )}
            {isWaitingForLocation && imageUrl && (
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white z-10">
                <svg className="animate-spin h-10 w-10 text-white mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-lg font-semibold">Verifying location...</p>
              </div>
            )}
        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
            <div className="text-center">
              <div className="text-8xl font-bold text-white mb-4 animate-pulse">
                {countdown}
              </div>
              <div className="text-2xl text-white">
                {countdown === 0 ? 'GO!' : 'Get ready...'}
              </div>
            </div>
          </div>
        )}

        {/* Timer Display */}
        {gameState.roundActive && !roundCompleted && countdown === null && (
          <div 
            className={`absolute top-4 left-1/2 -translate-x-1/2 w-24 h-24 flex items-center justify-center text-center text-4xl font-bold rounded-full shadow-2xl transition-all duration-300 z-20 ${
              timeRemaining <= 5 ? 'bg-red-600 text-white animate-pulse' : 'bg-white/90 text-gray-900'
            }`}
          >
            {timeRemaining}
          </div>
        )}

        {/* Status Bar Overlay */}
        <div 
          id="status-bar" 
          className={`absolute ${gameState.roundActive && !roundCompleted ? 'top-32' : 'top-4'} left-1/2 -translate-x-1/2 w-fit max-w-[90%] p-3 px-6 text-center text-lg md:text-xl font-bold bg-black/80 text-white rounded-full shadow-2xl transition-opacity duration-300 z-20 ${statusBarText ? 'opacity-100' : 'opacity-0'}`}
        >
          {statusBarText}
        </div>

        {/* Round Completed Overlay */}
        {roundCompleted && !gameCompleted && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-30">
            <div className="bg-white rounded-xl p-6 shadow-2xl max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-center mb-4 text-gray-800">Round Complete!</h2>
              <div className="mb-6">
                <Leaderboard players={gameState.players} />
              </div>
              <button
                onClick={onNextRound}
                className="w-full bg-[#ed2939] text-white text-xl font-bold py-4 px-8 rounded-lg shadow-lg hover:bg-red-700 active:scale-95 transition-all duration-200"
              >
                Next Round
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hamburger Menu */}
      <HamburgerMenu
        isOpen={showMenu}
        onClose={() => setShowMenu(!showMenu)}
        useNewImage={useNewImage}
        onUseNewImageChange={onUseNewImageChange}
        onDetectPosition={onDetectPosition}
        onToggleImageManager={onToggleImageManager}
        onManualPinpoint={onManualPinpoint}
        isManualPinpointMode={isManualPinpointMode}
        savedImagesCount={savedImages.length}
        isDetecting={isDetecting}
        imageUrl={imageUrl}
        isLoading={isLoading}
        onButtonClick={onButtonClick}
      />

      {/* Top Right - Room Info (only in waiting room) */}
      {isMultiplayer && roomPin && !gameStarted && (
        <div className="fixed top-4 right-4 z-40">
          <div className="bg-white/95 backdrop-blur p-3 rounded-lg shadow-lg text-center">
            <div className="text-xs text-gray-600 font-semibold">ROOM PIN</div>
            <div className="text-2xl font-bold text-[#ed2939] tracking-wider">{roomPin}</div>
          </div>
        </div>
      )}

      {/* Player Notification */}
      {recentScorer && showNotification && (
        <div className={`absolute left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-full shadow-lg z-25 animate-bounce ${
          gameState.roundActive && !roundCompleted ? 'top-32' : 'top-4'
        }`}>
          🎉 {recentScorer} found the ball!
        </div>
      )}

      {/* Bottom Right - Fullscreen Button (moved from zoom controls to avoid conflict) */}
      <button 
        id="fullscreen-button"
        onClick={onToggleFullScreen}
        className="fixed bottom-24 right-4 bg-gray-800 text-white p-3 rounded-lg shadow-lg hover:bg-gray-700 active:scale-90 transition-transform duration-200 z-40"
        aria-label={isFullScreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFullScreen ? <ContractIcon className="w-6 h-6" /> : <ExpandIcon className="w-6 h-6" />}
      </button>

      <DebugLog logs={logs} />
      {showImageManager && (
        <ImageManager 
          savedImages={savedImages}
          onDelete={onDeleteImage}
          onClose={onToggleImageManager}
        />
      )}
        </div>
      )}
    </>
  );
};

export default GameScreen;