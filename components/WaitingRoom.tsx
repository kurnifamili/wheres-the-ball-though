import React, { useState, useEffect } from 'react';
import VolumeControl from './VolumeControl';

interface WaitingRoomProps {
  roomPin: string;
  players: Array<{ name: string; joined_at?: string }>;
  isHost: boolean;
  hostPlayerName: string | null;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  totalRounds: number;
  onRoundsChange: (rounds: number) => void;
  onButtonClick?: () => void;
}

const WaitingRoom: React.FC<WaitingRoomProps> = ({
  roomPin,
  players,
  isHost,
  hostPlayerName,
  onStartGame,
  onLeaveRoom,
  isMuted,
  onToggleMute,
  totalRounds,
  onRoundsChange,
  onButtonClick
}) => {
  const [timeAgo, setTimeAgo] = useState<Record<string, string>>({});
  const [pinCopied, setPinCopied] = useState(false);

  // Generate QR code URL
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '?pin=' + roomPin)}`;

  const copyPin = async () => {
    try {
      await navigator.clipboard.writeText(roomPin);
      setPinCopied(true);
      setTimeout(() => setPinCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy PIN:', err);
    }
  };

  // Update time ago for each player
  useEffect(() => {
    const updateTimeAgo = () => {
      const now = new Date();
      const newTimeAgo: Record<string, string> = {};
      
      players.forEach(player => {
        if (player.joined_at) {
          const joinedTime = new Date(player.joined_at);
          const diffMs = now.getTime() - joinedTime.getTime();
          const diffSeconds = Math.floor(diffMs / 1000);
          const diffMinutes = Math.floor(diffSeconds / 60);
          const diffHours = Math.floor(diffMinutes / 60);
          
          if (diffHours > 0) {
            newTimeAgo[player.name] = `${diffHours}h ago`;
          } else if (diffMinutes > 0) {
            newTimeAgo[player.name] = `${diffMinutes}m ago`;
          } else {
            newTimeAgo[player.name] = `${diffSeconds}s ago`;
          }
        }
      });
      
      setTimeAgo(newTimeAgo);
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 1000);
    return () => clearInterval(interval);
  }, [players]);

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-transparent">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#ed2939] mb-2">Waiting Room</h1>
          <p className="text-gray-600">Share the PIN or QR code below to invite friends!</p>
        </div>

        {/* Room PIN */}
        <div className="text-center mb-8">
          <div className="text-sm text-gray-600 font-semibold mb-2">ROOM PIN</div>
          <div className="relative inline-block">
            <div className="text-6xl font-bold text-[#ed2939] tracking-wider mb-4">{roomPin}</div>
            <button
              onClick={() => {
                onButtonClick?.();
                copyPin();
              }}
              className="absolute -right-8 top-2 bg-gray-200 hover:bg-gray-300 text-gray-600 p-2 rounded-full transition-colors"
              title="Copy PIN"
            >
              {pinCopied ? (
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">Tell your friends to enter this PIN to join!</p>
          {pinCopied && (
            <div className="text-sm text-green-600 mb-4">✅ PIN copied to clipboard!</div>
          )}
          
          {/* Rounds Configuration - Only for host */}
          {isHost && (
            <div className="mt-6 mb-6">
              <div className="text-sm text-gray-600 font-semibold mb-3">Number of Rounds</div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    onButtonClick?.();
                    onRoundsChange(5);
                  }}
                  className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                    totalRounds === 5 
                      ? 'bg-[#ed2939] text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  5 Rounds
                </button>
                <button
                  onClick={() => {
                    onButtonClick?.();
                    onRoundsChange(10);
                  }}
                  className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                    totalRounds === 10 
                      ? 'bg-[#ed2939] text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  10 Rounds
                </button>
              </div>
            </div>
          )}
          
          {/* QR Code */}
          <div className="bg-gray-50 rounded-lg p-4 inline-block">
            <img 
              src={qrCodeUrl} 
              alt="QR Code" 
              className="mx-auto"
            />
            <p className="text-xs text-gray-500 mt-2">Or scan this QR code</p>
          </div>
        </div>

        {/* Players List */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Players ({players.length})
          </h2>
          {players.length === 1 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg mb-2">👋 Waiting for friends to join...</p>
              <p className="text-sm">Share the PIN above to invite them!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {players
                .sort((a, b) => {
                  // Sort by joined_at DESC (newest first)
                  if (!a.joined_at && !b.joined_at) return 0;
                  if (!a.joined_at) return 1;
                  if (!b.joined_at) return -1;
                  return new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime();
                })
                .map((player, index) => {
                  const isPlayerHost = player.name === hostPlayerName;
                  return (
                    <div 
                      key={player.name}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        isPlayerHost ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-3 ${
                          isPlayerHost ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        <span className="font-semibold text-gray-800">{player.name}</span>
                        {isPlayerHost && (
                          <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            Host
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {timeAgo[player.name] || 'Just joined'}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => {
              onButtonClick?.();
              onLeaveRoom();
            }}
            className="flex-1 py-3 px-6 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 active:scale-95 transition-all duration-200"
          >
            Leave Room
          </button>
          
          {isHost && (
            <button
              onClick={() => {
                onButtonClick?.();
                onStartGame();
              }}
              className="flex-1 py-3 px-6 bg-[#ed2939] text-white font-semibold rounded-lg hover:bg-red-700 active:scale-95 transition-all duration-200"
            >
              Start Game
            </button>
          )}
        </div>

        {isHost && (
          <p className="text-center text-sm text-gray-500 mt-4">
            🎮 You're the host! Start the game when everyone's ready
          </p>
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

export default WaitingRoom;
