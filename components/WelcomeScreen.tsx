import React, { useState } from 'react';
import VolumeControl from './VolumeControl';

interface WelcomeScreenProps {
  onCreateRoom: (playerName: string) => Promise<string>;
  onJoinRoom: (pin: string, playerName: string) => Promise<string>;
  isMultiplayer: boolean;
  roomPin: string | null;
  urlPin: string | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onButtonClick?: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
  onCreateRoom, 
  onJoinRoom,
  isMultiplayer,
  roomPin,
  urlPin,
  isMuted,
  onToggleMute,
  onButtonClick
}) => {
  const [playerName, setPlayerName] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>(urlPin ? 'join' : 'create');
  const [pin, setPin] = useState(urlPin || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) return;
    
    setLoading(true);
    setError('');
    try {
      const roomPin = await onCreateRoom(playerName.trim());
      // Don't call onJoinGame - let App handle showing waiting room
      setShowQR(true);
    } catch (err) {
      setError('Failed to create room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim() || !pin.trim()) return;
    if (pin.length !== 6) {
      setError('PIN must be 6 digits');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      await onJoinRoom(pin.trim(), playerName.trim());
      // Don't call onJoinGame - let App handle showing waiting room
    } catch (err) {
      setError('Room not found. Check the PIN and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      if (mode === 'create') handleCreateRoom();
      else if (mode === 'join' && pin.length === 6) handleJoinRoom();
    }
  };

  const qrCodeUrl = roomPin 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '?pin=' + roomPin)}`
    : '';

  return (
    <div
      id="welcome-container"
      className="screen flex flex-col items-center justify-center min-h-screen p-4 text-center bg-transparent"
    >
      <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full">
        <h1 className="text-5xl md:text-6xl font-black mb-4 text-[#ed2939] drop-shadow-md">
          Where's The Ball, Though?
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Find the red ball before time runs out!
        </p>

        {/* Mode Selection */}
        {!isMultiplayer && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => {
                onButtonClick?.();
                setMode('create');
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                mode === 'create' 
                  ? 'bg-[#ed2939] text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Create Room
            </button>
            <button
              onClick={() => {
                onButtonClick?.();
                setMode('join');
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                mode === 'join' 
                  ? 'bg-[#ed2939] text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Join Room
            </button>
          </div>
        )}

        {/* Name Input */}
        <input
          type="text"
          id="player-name-input"
          placeholder="Enter your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-white px-4 py-3 mb-4 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ed2939] focus:border-transparent transition"
        />

        {/* PIN Input (for join mode) */}
        {mode === 'join' && (
          <input
            type="text"
            placeholder="Enter 6-digit PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={handleKeyDown}
            maxLength={6}
            className="w-full bg-white px-4 py-3 mb-4 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ed2939] focus:border-transparent transition text-center tracking-widest font-mono"
          />
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Action Button */}
        <button
          id="join-game-button"
          onClick={() => {
            onButtonClick?.();
            if (mode === 'create') handleCreateRoom();
            else handleJoinRoom();
          }}
          disabled={
            !playerName.trim() || 
            loading || 
            (mode === 'join' && pin.length !== 6)
          }
          className="w-full px-8 py-4 text-xl font-bold text-white bg-[#ed2939] rounded-lg shadow-lg hover:bg-red-700 active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 transform"
        >
          {loading ? 'Loading...' : 
           mode === 'create' ? 'Create Room' :
           'Join Room'}
        </button>

        {/* QR Code Display */}
        {showQR && roomPin && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Share this PIN or QR code:</p>
            <div className="text-3xl font-bold text-[#ed2939] tracking-wider mb-3">
              {roomPin}
            </div>
            <img 
              src={qrCodeUrl} 
              alt="QR Code" 
              className="mx-auto"
            />
          </div>
        )}
      </div>
      
      {/* Volume Control */}
      <VolumeControl
        isMuted={isMuted}
        onToggleMute={onToggleMute}
      />
    </div>
  );
};

export default WelcomeScreen;
