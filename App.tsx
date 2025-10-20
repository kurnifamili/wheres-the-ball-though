import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import WelcomeScreen from './components/WelcomeScreen';
import GameScreen from './components/GameScreen';
import WaitingRoom from './components/WaitingRoom';
import VolumeControl from './components/VolumeControl';
import { useAudio } from './hooks/useAudio';
import type { GameState, CachedImageData, BoundingBox } from './types';

// Configure Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Default images array with their known answer positions
const DEFAULT_IMAGES: Array<{url: string, answerPosition: BoundingBox}> = [];

const LOADING_QUOTES = [
  "Ball is rolling around...",
  "Ball is bouncing somewhere...",
  "Don't rush me, I'm generating...",
  "Putting the 'art' in 'artificial intelligence'...",
  "Hiding ball better than my last payslip...",
  "Chope-ing this loading screen with a tissue packet...",
  "Checking if there's a queue for this image...",
  "Waking up the model... need Kopi O gao...",
  "Drawing more details than a BTO floor plan...",
  "Let me cook...",
  "Is it hot in here or is the GPU running?",
  "Shuffling pixels... harder than shuffling for NDP tickets.",
  "Adding a little bit of Singlish spice...",
  "Please wait, calculating the best place to hide from the sun.",
  "Trying not to draw another ERP gantry...",
  "Hope this loads faster than the BKE on a Friday...",
  "Asking the AI for a 5-star rating...",
  "Making sure ball is not in a restricted area...",
  "Rendering... faster than my cai fan order, hopefully.",
  "Final checks... confirm can, plus chop!"
];

const App: React.FC = () => {
  const audio = useAudio();
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    roundActive: false,
    answerPosition: null,
  });
  const [statusBarText, setStatusBarText] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isWaitingForLocation, setIsWaitingForLocation] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(LOADING_QUOTES[0]);
  const [useNewImage, setUseNewImage] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [hasApiError, setHasApiError] = useState(false);
  const [savedImages, setSavedImages] = useState<Array<{url: string, answerPosition: BoundingBox}>>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [usedImageUrls, setUsedImageUrls] = useState<Set<string>>(new Set());
  const [roundCompleted, setRoundCompleted] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isBackgroundDetecting, setIsBackgroundDetecting] = useState(false);
  const [showImageManager, setShowImageManager] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30); // seconds
  const [roundStartTime, setRoundStartTime] = useState<number | null>(null);
  const [roomPin, setRoomPin] = useState<string | null>(null);
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [urlPin, setUrlPin] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [roomPlayers, setRoomPlayers] = useState<Array<{name: string, joined_at: string}>>([]);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [hostPlayerName, setHostPlayerName] = useState<string | null>(null);
  const [recentScorer, setRecentScorer] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [timerWarningPlayed, setTimerWarningPlayed] = useState(false);
  const [timesUpPlayed, setTimesUpPlayed] = useState(false);
  const [totalRounds, setTotalRounds] = useState(5);
  const [currentRound, setCurrentRound] = useState(1);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [isManualPinpointMode, setIsManualPinpointMode] = useState(false);

  const cachedImageRef = useRef<CachedImageData | null>(null);
  const locatorPromiseRef = useRef<Promise<BoundingBox> | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  const logError = (message: string, error?: any) => {
    const errorMessage = error instanceof Error ? error.message : (error ? String(error) : 'Unknown error');
    const fullLog = `${new Date().toLocaleTimeString()}: ${message} - ${errorMessage}`;
    setLogs(prev => [fullLog, ...prev.slice(0, 4)]); // Keep last 5 logs
    console.error(message, error);
  };

  const saveImageUrl = async (url: string, answerPosition: BoundingBox) => {
    try {
      const { error } = await supabase
        .from('saved_images')
        .insert([{ 
          url,
          answer_x_min: answerPosition.x_min,
          answer_y_min: answerPosition.y_min,
          answer_x_max: answerPosition.x_max,
          answer_y_max: answerPosition.y_max
        }]);
      
      if (error) {
        console.error('Supabase error:', error);
        // Fallback to localStorage if Supabase fails
        const savedData = JSON.parse(localStorage.getItem('savedImages') || '[]');
        savedData.push({ url, answerPosition });
        localStorage.setItem('savedImages', JSON.stringify(savedData));
        setSavedImages(savedData);
      } else {
        console.log('Image saved to Supabase:', url);
        // Refresh the saved images list
        await loadSavedImages();
      }
    } catch (error) {
      console.error('Failed to save image:', error);
      // Fallback to localStorage
      const savedData = JSON.parse(localStorage.getItem('savedImages') || '[]');
      savedData.push({ url, answerPosition });
      localStorage.setItem('savedImages', JSON.stringify(savedData));
      setSavedImages(savedData);
    }
  };

  const updateImagePosition = async (url: string, answerPosition: BoundingBox) => {
    try {
      const { error } = await supabase
        .from('saved_images')
        .update({ 
          answer_x_min: answerPosition.x_min,
          answer_y_min: answerPosition.y_min,
          answer_x_max: answerPosition.x_max,
          answer_y_max: answerPosition.y_max
        })
        .eq('url', url);
      
      if (error) {
        console.error('Supabase update error:', error);
        // Fallback to localStorage
        const savedData = JSON.parse(localStorage.getItem('savedImages') || '[]');
        const index = savedData.findIndex((img: any) => img.url === url);
        if (index !== -1) {
          savedData[index].answerPosition = answerPosition;
          localStorage.setItem('savedImages', JSON.stringify(savedData));
          setSavedImages(savedData);
        }
      } else {
        console.log('Image position updated in Supabase:', url);
        // Refresh the saved images list
        await loadSavedImages();
      }
    } catch (error) {
      console.error('Failed to update image position:', error);
      // Fallback to localStorage
      const savedData = JSON.parse(localStorage.getItem('savedImages') || '[]');
      const index = savedData.findIndex((img: any) => img.url === url);
      if (index !== -1) {
        savedData[index].answerPosition = answerPosition;
        localStorage.setItem('savedImages', JSON.stringify(savedData));
        setSavedImages(savedData);
      }
    }
  };

  const deleteImage = async (url: string) => {
    try {
      const { error } = await supabase
        .from('saved_images')
        .delete()
        .eq('url', url);
      
      if (error) {
        console.error('Supabase delete error:', error);
        // Fallback to localStorage
        const savedData = JSON.parse(localStorage.getItem('savedImages') || '[]');
        const filtered = savedData.filter((img: any) => img.url !== url);
        localStorage.setItem('savedImages', JSON.stringify(filtered));
        setSavedImages(filtered);
      } else {
        console.log('Image deleted from Supabase:', url);
        // Refresh the saved images list
        await loadSavedImages();
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
      // Fallback to localStorage
      const savedData = JSON.parse(localStorage.getItem('savedImages') || '[]');
      const filtered = savedData.filter((img: any) => img.url !== url);
      localStorage.setItem('savedImages', JSON.stringify(filtered));
      setSavedImages(filtered);
    }
  };

  // Multiplayer functions
  const createRoom = async (playerName: string, rounds: number = 5) => {
    try {
      // Generate 6-digit pin
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({ 
          pin_code: pin,
          host_player_name: playerName,
          total_rounds: rounds,
          current_round: 0,
          game_completed: false
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add player to room
      const { error: playerError } = await supabase
        .from('room_players')
        .insert({ 
          room_id: room.id, 
          player_name: playerName,
          score: 0
        });

      if (playerError) throw playerError;

      setRoomPin(pin);
      setIsMultiplayer(true);
      setGameStarted(false);
      setPlayerName(playerName); // Set player name for waiting room
      
      // Load room players to show in waiting room
      await loadRoomPlayers(pin);
      
      console.log('Room created:', pin);
      return pin;
    } catch (error) {
      logError('Error creating room:', error);
      throw error;
    }
  };

  const joinRoom = async (pin: string, playerName: string) => {
    try {
      // Find room and check if game has started
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id, game_started')
        .eq('pin_code', pin)
        .eq('is_active', true)
        .single();

      if (roomError || !room) {
        throw new Error('Room not found');
      }

      // Check if game has already started
      if (room.game_started) {
        throw new Error('Game has already started. Please wait for the next game or create a new room.');
      }

      // Add player to room (upsert to handle rejoining)
      const { error: playerError } = await supabase
        .from('room_players')
        .upsert({ 
          room_id: room.id, 
          player_name: playerName,
          score: 0,
          joined_at: new Date().toISOString()
        }, {
          onConflict: 'room_id,player_name'
        });

      if (playerError) throw playerError;

      setRoomPin(pin);
      setIsMultiplayer(true);
      setGameStarted(false);
      setPlayerName(playerName); // Set player name for waiting room
      
      // Load room players to show in waiting room
      await loadRoomPlayers(pin);
      
      console.log('Joined room:', pin);
      return pin;
    } catch (error) {
      logError('Error joining room:', error);
      throw error;
    }
  };

  const updatePlayerScore = async (pin: string, playerName: string, scoreToAdd: number, timeTaken: number) => {
    try {
      const { data: room } = await supabase
        .from('rooms')
        .select('id')
        .eq('pin_code', pin)
        .single();

      if (!room) return;

      // Get current score first
      const { data: player } = await supabase
        .from('room_players')
        .select('score')
        .eq('room_id', room.id)
        .eq('player_name', playerName)
        .single();

      if (!player) return;

      const { error } = await supabase
        .from('room_players')
        .update({ 
          score: player.score + scoreToAdd,
          last_round_time: timeTaken
        })
        .eq('room_id', room.id)
        .eq('player_name', playerName);

      if (error) throw error;
    } catch (error) {
      logError('Error updating score:', error);
    }
  };

  // Update room's current round in database
  const updateRoomCurrentRound = async (pin: string, round: number) => {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ current_round: round })
        .eq('pin_code', pin);
      
      if (error) {
        console.error('Failed to update room current round:', error);
      } else {
        console.log(`Updated room ${pin} current round to ${round}`);
      }
    } catch (error) {
      console.error('Error updating room current round:', error);
    }
  };

  const loadRoomPlayers = async (pin: string) => {
    try {
      const { data: room } = await supabase
        .from('rooms')
        .select('id, total_rounds, current_round, game_completed, game_started, host_player_name')
        .eq('pin_code', pin)
        .single();

      if (!room) return;

      // Load room configuration
      setTotalRounds(room.total_rounds || 5);
      // Only update current round if database value is higher (to avoid resetting UI state)
      const dbRound = room.current_round || 0;
      if (dbRound > currentRound) {
        console.log(`Database round ${dbRound} is higher than UI round ${currentRound}, updating UI`);
        setCurrentRound(dbRound);
      } else {
        console.log(`Database round ${dbRound} is not higher than UI round ${currentRound}, keeping UI state`);
      }
      setGameCompleted(room.game_completed || false);
      
      // Update host status
      setIsHost(room.host_player_name === playerName);
      setHostPlayerName(room.host_player_name);
      console.log('Host status updated:', { host_player_name: room.host_player_name, playerName, isHost: room.host_player_name === playerName });
      
      // Update game started status from database
      if (room.game_started && !gameStarted) {
        console.log('Game already started in database, but player should not join mid-game');
        // Don't automatically start the game for players joining mid-game
        // They should be prevented from joining in the first place
      }

      const { data: players, error } = await supabase
        .from('room_players')
        .select('player_name, score, last_round_time, joined_at')
        .eq('room_id', room.id)
        .order('score', { ascending: false });

      if (error) throw error;

      if (players) {
        setGameState(prev => ({
          ...prev,
          players: players.map(p => ({ name: p.player_name, score: p.score }))
        }));
        
        // Update room players for waiting room
        setRoomPlayers(players.map(p => ({ 
          name: p.player_name, 
          joined_at: p.joined_at 
        })));
      }
    } catch (error) {
      logError('Error loading room players:', error);
    }
  };

  const startGameplay = async () => {
    setGameStarted(true);
    
    // Update database to notify other players
    if (isMultiplayer && roomPin) {
      try {
        const { error } = await supabase
          .from('rooms')
          .update({ game_started: true })
          .eq('pin_code', roomPin);
        
        if (error) {
          console.error('Failed to update game started status:', error);
        } else {
          console.log('Game started status updated in database');
        }
      } catch (error) {
        console.error('Error updating game started status:', error);
      }
    }
    
    startCountdown();
  };

  const startCountdown = () => {
    setCountdown(3);
    audio.announceCountdown(3); // Announce "3"
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownInterval);
          setCountdown(null);
          audio.announceCountdown(0); // Announce "Go!"
          // Start the first round after countdown
          if (playerName && !imageUrl && !isLoading && !hasApiError) {
            startNewRound();
          }
          return null;
        }
        audio.announceCountdown(prev - 1); // Announce "2" or "1"
        return prev - 1;
      });
    }, 1000);
  };

  const leaveRoom = async () => {
    // Remove player from database if in multiplayer mode
    if (isMultiplayer && roomPin && playerName) {
      try {
        // First get the room ID
        const { data: room } = await supabase
          .from('rooms')
          .select('id')
          .eq('pin_code', roomPin)
          .single();

        if (room) {
          // Check if this is the host leaving
          const { data: roomData } = await supabase
            .from('rooms')
            .select('host_player_name')
            .eq('pin_code', roomPin)
            .single();

          const isHostLeaving = roomData?.host_player_name === playerName;

          // Remove player from room_players table
          const { error } = await supabase
            .from('room_players')
            .delete()
            .eq('room_id', room.id)
            .eq('player_name', playerName);

          if (error) {
            console.error('Failed to remove player from room:', error);
          } else {
            console.log('Player removed from room:', playerName);
            
            // If host is leaving, transfer host to another player or disband room
            if (isHostLeaving) {
              const { data: remainingPlayers } = await supabase
                .from('room_players')
                .select('player_name')
                .eq('room_id', room.id)
                .order('joined_at', { ascending: true })
                .limit(1);

              if (remainingPlayers && remainingPlayers.length > 0) {
                // Transfer host to the first remaining player
                const newHost = remainingPlayers[0].player_name;
                await supabase
                  .from('rooms')
                  .update({ host_player_name: newHost })
                  .eq('pin_code', roomPin);
                console.log('Host transferred to:', newHost);
              } else {
                // No players left, deactivate room
                await supabase
                  .from('rooms')
                  .update({ is_active: false })
                  .eq('pin_code', roomPin);
                console.log('Room deactivated - no players remaining');
              }
            }
          }
        }
      } catch (error) {
        console.error('Error removing player from room:', error);
      }
    }

    // Clear local state
    setRoomPin(null);
    setIsMultiplayer(false);
    setGameStarted(false);
    setRoomPlayers([]);
    setPlayerName(null);
    setIsHost(false);
    setGameState({
      players: [],
      roundActive: false,
      answerPosition: null,
    });
  };

  const handleRoundsChange = async (rounds: number) => {
    if (!roomPin) return;
    
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ total_rounds: rounds })
        .eq('pin_code', roomPin);
      
      if (error) throw error;
      
      setTotalRounds(rounds);
    } catch (error) {
      logError('Error updating rounds:', error);
    }
  };

  const loadSavedImages = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_images')
        .select('url, answer_x_min, answer_y_min, answer_x_max, answer_y_max')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        // Fallback to localStorage
        const images = JSON.parse(localStorage.getItem('savedImages') || '[]');
        if (images.length === 0) {
          // Pre-populate with default images if localStorage is empty
          localStorage.setItem('savedImages', JSON.stringify(DEFAULT_IMAGES));
          setSavedImages(DEFAULT_IMAGES);
        } else {
          setSavedImages(images);
        }
      } else {
        const imagesWithPositions = data?.map(row => ({
          url: row.url,
          answerPosition: {
            x_min: Number(row.answer_x_min),
            y_min: Number(row.answer_y_min),
            x_max: Number(row.answer_x_max),
            y_max: Number(row.answer_y_max)
          }
        })) || [];
        
        if (imagesWithPositions.length === 0) {
          // If no images in Supabase, use default images
          setSavedImages(DEFAULT_IMAGES);
        } else {
          setSavedImages(imagesWithPositions);
        }
        console.log('Loaded saved images from Supabase:', imagesWithPositions.length);
      }
    } catch (error) {
      console.error('Failed to load saved images:', error);
      // Fallback to localStorage
      const images = JSON.parse(localStorage.getItem('savedImages') || '[]');
      if (images.length === 0) {
        localStorage.setItem('savedImages', JSON.stringify(DEFAULT_IMAGES));
        setSavedImages(DEFAULT_IMAGES);
      } else {
        setSavedImages(images);
      }
    }
  };

  const isRetryableError = (error: any): boolean => {
    // Check if error has a status property (common in HTTP libraries)
    if (error?.status && typeof error.status === 'number') {
      // Don't retry on 4xx (client errors) or 429 (rate limiting)
      if (error.status >= 400 && error.status < 500) {
        return false;
      }
      // Retry on 5xx server errors
      return error.status >= 500;
    }
    
    // Check if error message contains status codes
    const errorMessage = error instanceof Error ? error.message : String(error);
    const statusMatch = errorMessage.match(/\b(4\d{2}|5\d{2})\b/);
    if (statusMatch) {
      const status = parseInt(statusMatch[1]);
      // Don't retry on 4xx or 429, retry on 5xx
      if (status >= 400 && status < 500) {
        return false;
      }
      return status >= 500;
    }
    
    // Check for quota/rate limiting errors (don't retry)
    const nonRetryablePatterns = [
      'quota exceeded', 'rate limit', 'too many requests', '429',
      'bad request', 'unauthorized', 'forbidden', 'not found',
      'method not allowed', 'not acceptable', 'conflict',
      'gone', 'length required', 'precondition failed',
      'request entity too large', 'request uri too long',
      'unsupported media type', 'requested range not satisfiable',
      'expectation failed'
    ];
    
    return !nonRetryablePatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern)
    );
  };

  const showStatus = (text: string, duration: number = 3000) => {
    setStatusBarText(text);
    if (duration > 0) {
      setTimeout(() => setStatusBarText(prev => prev === text ? '' : prev), duration);
    }
  };
  
  const startNewRound = useCallback(async (incrementRound: boolean = false) => {
  if (isTransitioning) {
    console.log('startNewRound called but already transitioning - ignoring');
    return;
  }
  
  // Stop any existing timer
  if (timerIntervalRef.current) {
    clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = null;
  }
  
  // Increment round number only when explicitly requested (Next Round button)
  if (incrementRound) {
    console.log('Incrementing round counter from', currentRound, 'to', currentRound + 1);
    const newRound = currentRound + 1;
    
    // Check if game is completed
    if (newRound > totalRounds) {
      console.log(`Game completed! Round ${newRound} exceeds total rounds ${totalRounds}`);
      setGameCompleted(true);
      setCurrentRound(totalRounds); // Keep at max round for display
      
      // Announce game completion
      audio.announceGameComplete();
      
      // Update database if multiplayer
      if (isMultiplayer && roomPin) {
        await updateRoomCurrentRound(roomPin, totalRounds);
        // Mark game as completed in database
        await supabase
          .from('rooms')
          .update({ game_completed: true })
          .eq('pin_code', roomPin);
      }
      
      // Don't start a new round, show leaderboard instead
      setIsTransitioning(false);
      setIsLoading(false);
      return;
    }
    
    setCurrentRound(newRound);
    
    // Update database if multiplayer
    if (isMultiplayer && roomPin) {
      await updateRoomCurrentRound(roomPin, newRound);
    }
  }
  
  setIsTransitioning(true);
  setIsLoading(true);
  setHasApiError(false); // Reset error state when starting a new round
  setRoundCompleted(false); // Reset round completed state
  setTimeRemaining(30); // Reset timer
  setRoundStartTime(null);
  setGameState(prev => ({ ...prev, roundActive: false, answerPosition: null }));
  setImageUrl(null);
  locatorPromiseRef.current = null;
  setLoadingQuote(LOADING_QUOTES[Math.floor(Math.random() * LOADING_QUOTES.length)]);

  // In multiplayer mode, clear the current image from database for new round
  if (isMultiplayer && roomPin && incrementRound) {
    try {
      await supabase
        .from('rooms')
        .update({ 
          current_image_url: null,
          current_answer_position: null
        })
        .eq('pin_code', roomPin);
      console.log('Cleared current image from database for new round');
    } catch (error) {
      console.error('Error clearing current image from database:', error);
    }
  }

  try {
    // In multiplayer mode, check if there's already an image for this round
    if (isMultiplayer && roomPin) {
      const { data: room } = await supabase
        .from('rooms')
        .select('current_image_url, current_answer_position, host_player_name')
        .eq('pin_code', roomPin)
        .single();

      if (room?.current_image_url) {
        console.log('Using shared image from database:', room.current_image_url);
        setImageUrl(room.current_image_url);
        
        if (room.current_answer_position) {
          const answerPosition = room.current_answer_position as BoundingBox;
          setGameState(prev => ({ ...prev, answerPosition, roundActive: true }));
          showStatus("Using shared image... FIND BALL... GO!", 2000);
          startTimer();
          setIsLoading(false);
          setIsTransitioning(false);
          return;
        }
      } else {
        // No image yet - check if we're the host
        const isHost = room?.host_player_name === playerName;
        console.log('Host check:', { host_player_name: room?.host_player_name, playerName, isHost });
        if (!isHost) {
          console.log('Not the host, waiting for host to generate image...');
          showStatus("Waiting for host to generate image...", 2000);
          // Poll for image every 2 seconds
          const pollInterval = setInterval(async () => {
            const { data: updatedRoom } = await supabase
              .from('rooms')
              .select('current_image_url, current_answer_position')
              .eq('pin_code', roomPin)
              .single();
            
            if (updatedRoom?.current_image_url) {
              clearInterval(pollInterval);
              console.log('Host generated image, loading:', updatedRoom.current_image_url);
              setImageUrl(updatedRoom.current_image_url);
              
              if (updatedRoom.current_answer_position) {
                const answerPosition = updatedRoom.current_answer_position as BoundingBox;
                setGameState(prev => ({ ...prev, answerPosition, roundActive: true }));
                showStatus("Using shared image... FIND BALL... GO!", 2000);
                startTimer();
                setIsLoading(false);
                setIsTransitioning(false);
              }
            }
          }, 2000);
          
          // Clean up polling after 30 seconds
          setTimeout(() => {
            clearInterval(pollInterval);
          }, 30000);
          
          return;
        }
        // If we're the host, continue to generate image below
        console.log('Host generating new image for round');
      }
    }

    // Read the latest savedImages synchronously to avoid stale closures
    const currentSavedImages = savedImages;
    console.log('startNewRound called:', { useNewImage, savedImagesLength: currentSavedImages.length, cachedImage: !!cachedImageRef.current });
        
    if (!useNewImage && cachedImageRef.current) {
      const cachedData = cachedImageRef.current;
      setImageUrl(cachedData.url);
      locatorPromiseRef.current = Promise.resolve(cachedData.bbox);
      locatorPromiseRef.current.then(bbox => {
        setGameState(prev => ({...prev, answerPosition: bbox, roundActive: true}));
        startTimer(); // Start the timer when round becomes active
      });
      setIsLoading(false);
      setIsTransitioning(false);
      return;
    }

    // If not using new image and we have saved images, use a random saved image
    if (!useNewImage && currentSavedImages.length > 0) {
      console.log('Using saved image from array');
      
      // Filter out already used images
      const unusedImages = currentSavedImages.filter(img => !usedImageUrls.has(img.url));
      
      // If all images have been used, generate a new image instead of reusing
      if (unusedImages.length === 0) {
        console.log('All saved images used, generating new image instead of reusing');
        // Force generation by setting useNewImage to true and continuing to generation logic
        setUseNewImage(true);
        // Continue to the generation logic below instead of returning
      } else {
        const randomImage = unusedImages[Math.floor(Math.random() * unusedImages.length)];
        setImageUrl(randomImage.url);
        setUsedImageUrls(prev => new Set([...prev, randomImage.url]));
            
        // Use the saved answer position
        const answerPosition = randomImage.answerPosition;
        console.log('Using saved answer position:', answerPosition);
        console.log('Image URL:', randomImage.url);
            
        cachedImageRef.current = { url: randomImage.url, bbox: answerPosition };
        setGameState(prev => ({ ...prev, answerPosition, roundActive: true }));
        showStatus("Using saved image... FIND BALL... GO!", 2000);
        startTimer();
        setIsLoading(false);
        setIsTransitioning(false);
        return;
      }
    }

    // If we don't have saved images yet, generate a new one instead
    if (!useNewImage && currentSavedImages.length === 0 && DEFAULT_IMAGES.length === 0) {
      console.log('No saved images available, will generate new image instead');
      // Fall through to generation logic below
    } else if (!useNewImage && currentSavedImages.length === 0) {
      console.log('No saved images yet, waiting...');
      showStatus("Loading saved images...", 2000);
      setTimeout(() => {
        if (savedImages.length > 0) {
          startNewRound();
        } else if (DEFAULT_IMAGES.length > 0) {
          // Fallback to default image
          const defaultImageData = DEFAULT_IMAGES[0];
          setImageUrl(defaultImageData.url);
                    
          cachedImageRef.current = { url: defaultImageData.url, bbox: defaultImageData.answerPosition };
          setGameState(prev => ({ ...prev, answerPosition: defaultImageData.answerPosition, roundActive: true }));
          showStatus("Using default image... FIND BALL... GO!", 2000);
          setIsLoading(false);
          setIsTransitioning(false);
        } else {
          // No saved or default images, generate new one
          console.log('No saved or default images, generating new image');
          showStatus("Generating first image...", 0);
          setIsLoading(false);
          setIsTransitioning(false);
        }
      }, 1000);
      return;
    }

    // Step 1: Generate the image using Supabase Edge Function
    console.log('Generating NEW image with Edge Function');
    showStatus("Generating a new scene...", 0);
        
    const imagePrompt = `A highly detailed "Where's Waldo" style cartoon illustration with MAXIMUM detail and complexity. The scene is an extremely crowded and bustling Singaporean hawker centre with hundreds of tiny cartoon characters. Include:

- VERY SMALL cartoon-style people (each person should be tiny, around 20-30 pixels tall in the final image)
- Hundreds of individual characters doing different activities
- EXACTLY ONE small red ball cleverly hidden among the chaos - visible but not obvious, blending naturally into the busy scene
- Dozens of food stalls with intricate details - hanging signs, cooking equipment, food displays
- Multiple layers of depth - people in foreground, middle ground, and background
- Complex overlapping elements - tables, chairs, food carts, decorations, signs
- Dense crowds with people standing, sitting, eating, cooking, talking, walking
- Intricate Singaporean hawker centre details - lanterns, umbrellas, menus, drinks, condiments
- Rich colors and textures throughout every inch of the scene
- Maximum visual complexity - every corner should be packed with interesting details to examine

CRITICAL REQUIREMENTS: 
1. There must be ONLY ONE red ball in the entire image - no duplicates
2. The red ball should be small and naturally hidden among objects or people, but still fully visible when zoomed in
3. Characters must be VERY SMALL to create the classic "Where's Waldo" search experience
4. The scene must be EXTREMELY CROWDED and detailed - imagine 200+ individual elements
5. Style: Ultra-detailed classic "Where's Waldo" illustration where finding anything requires careful searching and zooming.`;
        
    const imageResponse = await fetch(`${supabaseUrl}/functions/v1/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        prompt: imagePrompt,
        image_size: "square_hd",
        num_inference_steps: 28
      })
    });

    if (!imageResponse.ok) {
      const errorData = await imageResponse.json();
      throw new Error(`Image generation failed: ${errorData.error || 'Unknown error'}`);
    }

    const imageResult = await imageResponse.json();

    console.log("Full image result:", JSON.stringify(imageResult, null, 2));
        
    if (!imageResult.success || !imageResult.imageUrl) {
      console.error("Image generation failed - result structure:", imageResult);
      throw new Error(`Image generation failed, no image data returned. Result: ${JSON.stringify(imageResult)}`);
    }
        
    const generatedUrl = imageResult.imageUrl;
    setImageUrl(generatedUrl);
    setUsedImageUrls(prev => new Set([...prev, generatedUrl]));
    console.log('Generated new image URL:', generatedUrl);
    
    // Keep loading spinner until image is fully downloaded
    // Image will be hidden until onLoad fires
    setIsTransitioning(false); // Remove opacity filter
    setIsBackgroundDetecting(true); // Track that detection is happening
    // isLoading stays true until handleImageLoad is called
    
    // Step 2: Use Supabase Edge Function to detect where the ball actually is (in parallel)
    const detectionPromise = (async () => {
      const response = await fetch(`${supabaseUrl}/functions/v1/detect-ball`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          imageUrl: generatedUrl
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Ball detection failed: ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      
      if (!result.success || !result.boundingBox) {
        throw new Error('Failed to detect ball location from Edge Function response');
      }
      
      const answerPosition = result.boundingBox;
      console.log('Detected ball position:', answerPosition);
      
      return answerPosition;
    })();
    
    // Store the promise so clicks can await it
    locatorPromiseRef.current = detectionPromise;
    
    // Wait for detection to complete, then enable the game
    detectionPromise.then(async (answerPosition) => {
      // Save the image URL and detected answer position for future use
      await saveImageUrl(generatedUrl, answerPosition);

      // In multiplayer mode, save the image and answer position to the database
      if (isMultiplayer && roomPin) {
        try {
          const { error } = await supabase
            .from('rooms')
            .update({ 
              current_image_url: generatedUrl,
              current_answer_position: answerPosition
            })
            .eq('pin_code', roomPin);
          
          if (error) {
            console.error('Failed to save image to database:', error);
          } else {
            console.log('Saved image and answer position to database for room:', roomPin);
          }
        } catch (error) {
          console.error('Error saving image to database:', error);
        }
      }

      // Use the detected position
      cachedImageRef.current = { url: generatedUrl, bbox: answerPosition };
      setGameState(prev => ({ ...prev, answerPosition, roundActive: true }));
      setIsBackgroundDetecting(false);
      startTimer(); // Start the timer when round becomes active
      // No need to show status again, already shown when image rendered
    }).catch((error) => {
      logError("Error detecting ball location:", error);
      setIsBackgroundDetecting(false);
      showStatus("Failed to detect ball. Click to retry.", 0);
      setHasApiError(true);
    });

  } catch (error) {
    logError("Error generating image:", error);
    showStatus("Image generation failed. Click anywhere to retry.", 0);
    setIsLoading(false);
    setHasApiError(true);
    setIsTransitioning(false);
  }
  }, [useNewImage, isTransitioning, savedImages, usedImageUrls, currentRound, isMultiplayer, roomPin, updateRoomCurrentRound]);

  // Reset game to start over from round 1
  const resetGame = useCallback(async () => {
    console.log('Resetting game to start over');
    setCurrentRound(1);
    setGameCompleted(false);
    setRoundCompleted(false);
    setUsedImageUrls(new Set()); // Reset used images
    
    // Update database if multiplayer
    if (isMultiplayer && roomPin) {
      await updateRoomCurrentRound(roomPin, 1);
      await supabase
        .from('rooms')
        .update({ game_completed: false, game_started: false })
        .eq('pin_code', roomPin);
    }
    
    // Reset local game started state
    setGameStarted(false);
    
    // Start the first round
    await startNewRound(false); // Don't increment round since we're starting from 1
  }, [isMultiplayer, roomPin, updateRoomCurrentRound, startNewRound]);


  const detectBallPosition = useCallback(async () => {
    if (!imageUrl || isDetecting) {
      console.log('No image to detect or already detecting');
      return;
    }

    setIsDetecting(true);
    setIsWaitingForLocation(true);
    showStatus("Detecting ball position...", 0);

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/detect-ball`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          imageUrl: imageUrl
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Ball detection failed: ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      
      if (!result.success || !result.boundingBox) {
        throw new Error('Failed to detect ball location from Edge Function response');
      }
      
      const answerPosition = result.boundingBox;
      console.log('Detected ball position:', answerPosition);
      console.log('For image URL:', imageUrl);
      
      // Update the game state with detected position
      cachedImageRef.current = { url: imageUrl, bbox: answerPosition };
      setGameState(prev => ({ ...prev, answerPosition, roundActive: true }));
      setIsWaitingForLocation(false);
      setIsDetecting(false);
      showStatus("Ball detected! Position updated in database.", 3000);
      
      // Update position in database
      await updateImagePosition(imageUrl, answerPosition);
      
    } catch (error) {
      logError("Error detecting ball position:", error);
      setIsWaitingForLocation(false);
      setIsDetecting(false);
      showStatus("Failed to detect ball position.", 3000);
    }
  }, [imageUrl, isDetecting, showStatus, logError, saveImageUrl]);

  const handleManualPinpoint = () => {
    setIsManualPinpointMode(!isManualPinpointMode);
    if (isManualPinpointMode) {
      showStatus("Manual pinpoint mode disabled", 2000);
    } else {
      showStatus("Click on the image to pinpoint the ball location", 3000);
    }
  };

  const handleManualPinpointClick = async (xPercent: number, yPercent: number) => {
    if (!isManualPinpointMode || !imageUrl) return;
    
    // Convert click coordinates to bounding box
    const ballSize = 0.02; // 2% of image size
    const answerPosition = {
      x_min: Math.max(0, xPercent - ballSize/2),
      y_min: Math.max(0, yPercent - ballSize/2),
      x_max: Math.min(1, xPercent + ballSize/2),
      y_max: Math.min(1, yPercent + ballSize/2)
    };
    
    try {
      await updateImagePosition(imageUrl, answerPosition);
      setGameState(prev => ({ ...prev, answerPosition }));
      setIsManualPinpointMode(false);
      showStatus("Ball location manually pinpointed!", 2000);
    } catch (error) {
      logError("Error updating ball position:", error);
      showStatus("Failed to update position. Try again.", 2000);
    }
  };

  // Check for PIN in URL params (QR code join)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pinFromUrl = urlParams.get('pin');
    if (pinFromUrl && pinFromUrl.length === 6) {
      setUrlPin(pinFromUrl);
    }
  }, []);

  useEffect(() => {
    if (playerName && !imageUrl && !isLoading && !hasApiError && gameStarted) {
      startNewRound();
    }
  }, [playerName, imageUrl, isLoading, hasApiError, gameStarted, startNewRound]);

  useEffect(() => {
    loadSavedImages();
  }, []);

  // Subscribe to real-time score updates
  useEffect(() => {
    if (!isMultiplayer || !roomPin) return;

    const subscription = supabase
      .channel(`room_${roomPin}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'room_players' 
        }, 
        (payload) => {
          console.log('Real-time update:', payload);
          
          // Check if this is a score update (not a new player joining)
          if (payload.eventType === 'UPDATE' && payload.new) {
            const oldScore = payload.old?.score || 0;
            const newScore = payload.new?.score || 0;
            
            if (newScore > oldScore) {
              // Someone scored!
              const scorerName = payload.new?.player_name;
              if (scorerName && scorerName !== playerName) {
                setRecentScorer(scorerName);
                setShowNotification(true);
                
                // Only play audio announcements when game has started
                if (gameStarted) {
                  audio.announcePlayerFoundBall(scorerName); // Voice announcement
                }
                
                // Hide notification after 3 seconds
                setTimeout(() => {
                  setShowNotification(false);
                  setRecentScorer(null);
                }, 3000);
              }
            }
          }
          
          // Reload leaderboard when any player updates
          loadRoomPlayers(roomPin);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [isMultiplayer, roomPin, playerName]);

  // Subscribe to room state changes (game started)
  useEffect(() => {
    if (!isMultiplayer || !roomPin) return;

    const subscription = supabase
      .channel(`room_state_${roomPin}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'rooms',
          filter: `pin_code=eq.${roomPin}`
        }, 
        (payload) => {
          console.log('Room state update:', payload);
          
          // Handle game started updates
          if (payload.new?.game_started && !gameStarted && playerName) {
            // Check if this player is already in the room
            const isPlayerInRoom = roomPlayers.some(p => p.name === playerName);
            if (isPlayerInRoom) {
              console.log('Game started by host, transitioning to game screen');
              setGameStarted(true);
              startCountdown();
            }
          }
          
          // Handle image updates (when host generates image)
          if (payload.new?.current_image_url && !imageUrl && playerName) {
            const isPlayerInRoom = roomPlayers.some(p => p.name === playerName);
            if (isPlayerInRoom) {
              console.log('Host generated image, loading for non-host player:', payload.new.current_image_url);
              setImageUrl(payload.new.current_image_url);
              
              if (payload.new.current_answer_position) {
                const answerPosition = payload.new.current_answer_position as BoundingBox;
                setGameState(prev => ({ ...prev, answerPosition, roundActive: true }));
                showStatus("Using shared image... FIND BALL... GO!", 2000);
                startTimer();
                setIsLoading(false);
                setIsTransitioning(false);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [isMultiplayer, roomPin, gameStarted, playerName, roomPlayers, imageUrl]);
  
  useEffect(() => {
    let quoteInterval: number;
    if (isLoading) {
      quoteInterval = window.setInterval(() => {
        setLoadingQuote(prevQuote => {
          let nextQuote = prevQuote;
          while (nextQuote === prevQuote) {
            nextQuote = LOADING_QUOTES[Math.floor(Math.random() * LOADING_QUOTES.length)];
          }
          return nextQuote;
        });
      }, 7500); // Increased interval by 50%
    }
    return () => clearInterval(quoteInterval);
  }, [isLoading]);

  const performHitCheck = (xPercent: number, yPercent: number, position: BoundingBox) => {
    const tolerance = 0.05; // 5% tolerance around the box
    const hit = xPercent >= position.x_min - tolerance && xPercent <= position.x_max + tolerance &&
                yPercent >= position.y_min - tolerance && yPercent <= position.y_max + tolerance;

    console.log('performHitCheck', { xPercent, yPercent, position, hit });

    if (hit) {
      // Stop timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      // Calculate score based on time remaining
      const timeTaken = roundStartTime ? Date.now() - roundStartTime : 15000;
      const secondsTaken = Math.floor(timeTaken / 1000);
      const baseScore = 100;
      const timeBonus = Math.max(0, timeRemaining * 10); // 10 points per second remaining
      const totalScore = baseScore + timeBonus;

      // Clear cached image so next round doesn't reuse it indefinitely
      cachedImageRef.current = null;

      setGameState(prev => ({
        ...prev,
        players: prev.players.map(p => p.name === playerName ? { ...p, score: p.score + totalScore } : p),
        roundActive: false,
      }));
      
      // Update score in database if multiplayer
      if (isMultiplayer && roomPin) {
        updatePlayerScore(roomPin, playerName!, totalScore, Math.floor(timeTaken));
      }

      showStatus(`You found Ball! +${totalScore} points! (${secondsTaken}s)`, 0);
      setRoundCompleted(true);
      audio.playSound('success');
      audio.announceRoundComplete(); // Voice announcement
    } else {
      showStatus("Not quite... Keep looking!", 1500);
    }
  };

  const handleImageClick = async (xPercent: number, yPercent: number) => {
    // Handle manual pinpoint mode first
    if (isManualPinpointMode) {
      await handleManualPinpointClick(xPercent, yPercent);
      return;
    }
    
    // Allow retry on API errors
    if (hasApiError) {
      startNewRound();
      return;
    }
    
    // Allow clicks during background detection or when round is active
    if (!gameState.roundActive && !isBackgroundDetecting) return;

    if (gameState.answerPosition) {
        performHitCheck(xPercent, yPercent, gameState.answerPosition);
    } else if (locatorPromiseRef.current) {
        setIsWaitingForLocation(true);
        try {
            const position = await locatorPromiseRef.current;
            performHitCheck(xPercent, yPercent, position);
        } catch (error) {
            logError("Failed to get location on click:", error);
            showStatus("Sorry, couldn't verify the location.", 2000);
        } finally {
            setIsWaitingForLocation(false);
        }
    }
  };

  const startTimer = () => {
    setRoundStartTime(Date.now());
    setTimeRemaining(30);
    setTimerWarningPlayed(false); // Reset warning flag
    setTimesUpPlayed(false); // Reset times up flag
    
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    timerIntervalRef.current = window.setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === 5 && !timerWarningPlayed) {
          // Play timer warning sound only once at exactly 5 seconds
          audio.playSound('timer-warning');
          setTimerWarningPlayed(true);
        }
        
        if (prev <= 1) {
          // Time's up!
          if (!timesUpPlayed) {
            audio.playSound('times-up');
            audio.announceTimesUp(); // Voice announcement
            setTimesUpPlayed(true);
          }
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          setGameState(prevState => ({ ...prevState, roundActive: false }));
          setRoundCompleted(true);
          showStatus("Time's up! Try again.", 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    // Show the "go" message when image is fully loaded and visible
    if (isBackgroundDetecting || gameState.roundActive) {
      showStatus("FIND BALL... GO!", 2000);
    }
  };

  const handleToggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const onFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullScreenChange);
      // Cleanup timer on unmount
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  if (!playerName) {
    return <WelcomeScreen 
      onCreateRoom={createRoom}
      onJoinRoom={joinRoom}
      isMultiplayer={isMultiplayer}
      roomPin={roomPin}
      urlPin={urlPin}
      isMuted={audio.isMuted}
      onToggleMute={() => audio.setIsMuted(!audio.isMuted)}
      onButtonClick={() => audio.playSound('button-click')}
    />;
  }

  // Show waiting room if multiplayer and game hasn't started
  if (isMultiplayer && !gameStarted) {
    return (
      <WaitingRoom
        roomPin={roomPin!}
        players={roomPlayers}
        isHost={isHost}
        hostPlayerName={hostPlayerName}
        onStartGame={startGameplay}
        onLeaveRoom={leaveRoom}
        isMuted={audio.isMuted}
        onToggleMute={() => audio.setIsMuted(!audio.isMuted)}
        totalRounds={totalRounds}
        onRoundsChange={handleRoundsChange}
        onButtonClick={() => audio.playSound('button-click')}
      />
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{
        backgroundImage: 'url(/assets/background.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        minHeight: '100vh',
        backgroundColor: '#1f2937'
      }}
    >
      {/* Only render GameScreen when game has started */}
      {gameStarted && (
        <GameScreen 
          gameState={gameState}
          statusBarText={statusBarText}
          isFullScreen={isFullScreen}
          imageUrl={imageUrl}
          isLoading={isLoading}
          isWaitingForLocation={isWaitingForLocation}
          isTransitioning={isTransitioning}
          loadingQuote={loadingQuote}
          useNewImage={useNewImage}
          hasApiError={hasApiError}
          roundCompleted={roundCompleted}
          isDetecting={isDetecting}
          isBackgroundDetecting={isBackgroundDetecting}
          savedImages={savedImages}
          showImageManager={showImageManager}
          timeRemaining={timeRemaining}
          roomPin={roomPin}
          isMultiplayer={isMultiplayer}
          gameStarted={gameStarted}
          recentScorer={recentScorer}
          showNotification={showNotification}
          countdown={countdown}
          currentRound={currentRound}
          totalRounds={totalRounds}
          gameCompleted={gameCompleted}
          onUseNewImageChange={setUseNewImage}
          onImageClick={handleImageClick}
          onImageLoad={handleImageLoad}
          onToggleFullScreen={handleToggleFullScreen}
          onNextRound={() => startNewRound(true)}
          onDetectPosition={detectBallPosition}
          onToggleImageManager={() => setShowImageManager(!showImageManager)}
          onDeleteImage={deleteImage}
          onManualPinpoint={handleManualPinpoint}
          isManualPinpointMode={isManualPinpointMode}
          onResetGame={resetGame}
          onButtonClick={() => audio.playSound('button-click')}
          logs={logs}
        />
      )}
      
      {/* Volume Control - always visible */}
      <VolumeControl
        isMuted={audio.isMuted}
        onToggleMute={() => audio.setIsMuted(!audio.isMuted)}
        onButtonClick={() => audio.playSound('button-click')}
      />
    </div>
  );
};

export default App;