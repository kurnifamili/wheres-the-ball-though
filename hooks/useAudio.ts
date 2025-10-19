import { useState, useRef, useCallback, useEffect } from 'react';
import { playGeneratedSpeech, GameAnnouncements, preloadCommonAnnouncements } from '../utils/elevenlabs';

interface AudioManager {
  playSound: (soundName: string) => void;
  playMusic: () => void;
  stopMusic: () => void;
  announce: (text: string) => Promise<void>;
  announceCountdown: (number: number) => Promise<void>;
  announcePlayerFoundBall: (playerName: string) => Promise<void>;
  announcePlayerInLead: (playerName: string) => Promise<void>;
  announceRoundComplete: () => Promise<void>;
  announceTimesUp: () => Promise<void>;
  announceGameComplete: () => Promise<void>;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  volume: number;
  setVolume: (volume: number) => void;
}

export const useAudio = (): AudioManager => {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const isAnnouncingRef = useRef(false);
  const isMusicPlayingRef = useRef(false);
  const soundRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Preload audio files
  const preloadAudio = useCallback((soundName: string, path: string) => {
    if (!soundRefs.current.has(soundName)) {
      console.log(`Preloading audio: ${soundName} from ${path}`);
      const audio = new Audio(path);
      audio.preload = 'auto';
      audio.volume = volume;
      
      // Add error handling for audio loading
      audio.addEventListener('error', (e) => {
        console.error(`Failed to load audio file ${soundName} from ${path}:`, e);
      });
      
      audio.addEventListener('canplaythrough', () => {
        console.log(`Audio ${soundName} loaded successfully`);
      });
      
      soundRefs.current.set(soundName, audio);
    }
  }, [volume]);

  // Preload all sound effects
  const preloadSounds = useCallback(() => {
    console.log('Preloading sound effects...');
    preloadAudio('timer-warning', '/audio/sfx/timer-warning.mp3');
    preloadAudio('times-up', '/audio/sfx/times-up.mp3');
    preloadAudio('success', '/audio/sfx/success.mp3');
    preloadAudio('button-click', '/audio/sfx/button-click.mp3');
    
    // Preload background music - only create if it doesn't exist
    if (!musicRef.current) {
      console.log('Creating new background music Audio object');
      musicRef.current = new Audio('/audio/music/background.mp3');
      musicRef.current.loop = true;
      musicRef.current.volume = volume * 0.3; // Lower volume for background music
      
      musicRef.current.addEventListener('error', (e) => {
        console.error('Failed to load background music:', e);
      });
      
      musicRef.current.addEventListener('canplaythrough', () => {
        console.log('Background music loaded successfully');
      });
      
      // Add event listeners to track music state
      musicRef.current.addEventListener('play', () => {
        console.log('Background music started playing');
        isMusicPlayingRef.current = true;
      });
      
      musicRef.current.addEventListener('pause', () => {
        console.log('Background music paused');
        isMusicPlayingRef.current = false;
      });
      
      musicRef.current.addEventListener('ended', () => {
        console.log('Background music ended');
        isMusicPlayingRef.current = false;
      });
    } else {
      console.log('Background music Audio object already exists');
    }
    
    // Log available sounds after a short delay
    setTimeout(() => {
      console.log('Available sounds:', Array.from(soundRefs.current.keys()));
    }, 1000);
  }, [preloadAudio]); // Remove volume from dependencies to prevent recreation

  // Auto-start background music when hook initializes
  useEffect(() => {
    let timeoutId: number;
    let hasStartedMusic = false;
    
    const startMusic = () => {
      console.log('startMusic called - hasStartedMusic:', hasStartedMusic, 'isMusicPlaying:', isMusicPlayingRef.current, 'musicRef exists:', !!musicRef.current, 'isMuted:', isMuted, 'is paused:', musicRef.current?.paused);
      
      if (hasStartedMusic || isMusicPlayingRef.current || !musicRef.current || isMuted || !musicRef.current.paused) {
        console.log('startMusic blocked - already started or conditions not met');
        return;
      }
      
      console.log('Starting background music automatically');
      hasStartedMusic = true;
      isMusicPlayingRef.current = true;
      musicRef.current.volume = volume * 0.3;
      musicRef.current.play().catch(error => {
        console.warn('Failed to auto-play background music:', error);
        hasStartedMusic = false; // Reset flag on failure
        isMusicPlayingRef.current = false;
      });
    };
    
    const handleUserInteraction = async () => {
      // Enable audio context for ElevenLabs speech
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
          console.log('Audio context enabled for ElevenLabs speech');
        }
      } catch (error) {
        console.warn('Failed to enable audio context:', error);
      }
      
      startMusic();
      // Remove listeners after first successful interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
    
    // Preload sounds and voice announcements
    preloadSounds();
    preloadCommonAnnouncements().catch(error => {
      console.warn('Failed to preload voice announcements:', error);
    });
    
    // Try to start music immediately, but also set up a fallback
    startMusic();
    timeoutId = setTimeout(startMusic, 1000);
    
    // Add user interaction listeners
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []); // Empty dependency array - only run once on mount

  // Handle volume and mute changes for background music
  useEffect(() => {
    if (musicRef.current) {
      if (isMuted) {
        musicRef.current.pause();
      } else {
        musicRef.current.volume = volume * 0.3;
        musicRef.current.play().catch(error => {
          console.warn('Failed to resume background music:', error);
        });
      }
    }
  }, [isMuted, volume]);

  const playSound = useCallback((soundName: string) => {
    console.log(`playSound called for: ${soundName}, isMuted: ${isMuted}, volume: ${volume}`);
    
    if (isMuted) {
      console.log(`Sound ${soundName} blocked - audio is muted`);
      return;
    }
    
    const audio = soundRefs.current.get(soundName);
    console.log(`Audio for ${soundName}:`, audio ? 'found' : 'not found');
    console.log('Available sounds:', Array.from(soundRefs.current.keys()));
    
    if (audio) {
      console.log(`Playing sound: ${soundName}`);
      audio.currentTime = 0; // Reset to beginning
      audio.volume = volume;
      audio.play().catch(error => {
        console.warn(`Failed to play sound ${soundName}:`, error);
        // Try to reload the audio file if it fails
        console.log(`Attempting to reload audio file for ${soundName}`);
        preloadAudio(soundName, `/audio/sfx/${soundName}.mp3`);
      });
    } else {
      console.warn(`Sound ${soundName} not found in cache. Available sounds:`, Array.from(soundRefs.current.keys()));
      // Try to preload the sound if it's missing
      preloadAudio(soundName, `/audio/sfx/${soundName}.mp3`);
    }
  }, [isMuted, volume, preloadAudio]);

  const playMusic = useCallback(() => {
    console.log('playMusic called - isMuted:', isMuted, 'isMusicPlaying:', isMusicPlayingRef.current, 'musicRef exists:', !!musicRef.current, 'is paused:', musicRef.current?.paused);
    
    if (isMuted || isMusicPlayingRef.current || !musicRef.current || !musicRef.current.paused) {
      console.log('playMusic blocked - music already playing or muted');
      return;
    }
    
    console.log('Starting background music manually');
    isMusicPlayingRef.current = true;
    musicRef.current.currentTime = 0;
    musicRef.current.volume = volume * 0.3;
    musicRef.current.play().catch(error => {
      console.warn('Failed to play background music:', error);
      isMusicPlayingRef.current = false;
    });
  }, [isMuted, volume]);

  const stopMusic = useCallback(() => {
    if (musicRef.current) {
      console.log('Stopping background music');
      musicRef.current.pause();
      musicRef.current.currentTime = 0;
      isMusicPlayingRef.current = false;
    }
  }, []);

  const announce = useCallback(async (text: string) => {
    if (isMuted) return;
    
    try {
      await playGeneratedSpeech(text, volume);
    } catch (error) {
      console.warn('Failed to play announcement:', error);
    }
  }, [isMuted, volume]);

  const announceCountdown = useCallback(async (number: number) => {
    if (isMuted || isAnnouncingRef.current) return;
    
    isAnnouncingRef.current = true;
    try {
      const text = GameAnnouncements.countdown(number);
      await playGeneratedSpeech(text, volume);
    } catch (error) {
      console.warn('Failed to play countdown:', error);
    } finally {
      // Reset the flag after a short delay to prevent rapid successive calls
      setTimeout(() => {
        isAnnouncingRef.current = false;
      }, 1000);
    }
  }, [isMuted, volume]);

  const announcePlayerFoundBall = useCallback(async (playerName: string) => {
    if (isMuted) return;
    
    try {
      const text = GameAnnouncements.playerFoundBall(playerName);
      await playGeneratedSpeech(text, volume);
    } catch (error) {
      console.warn('Failed to play player found ball announcement:', error);
    }
  }, [isMuted, volume]);

  const announcePlayerInLead = useCallback(async (playerName: string) => {
    if (isMuted) return;
    
    try {
      const text = GameAnnouncements.playerInLead(playerName);
      await playGeneratedSpeech(text, volume);
    } catch (error) {
      console.warn('Failed to play player in lead announcement:', error);
    }
  }, [isMuted, volume]);

  const announceRoundComplete = useCallback(async () => {
    if (isMuted) return;
    
    try {
      const text = GameAnnouncements.roundComplete();
      await playGeneratedSpeech(text, volume);
    } catch (error) {
      console.warn('Failed to play round complete announcement:', error);
    }
  }, [isMuted, volume]);

  const announceTimesUp = useCallback(async () => {
    if (isMuted) return;
    
    try {
      const text = GameAnnouncements.timesUp();
      await playGeneratedSpeech(text, volume);
    } catch (error) {
      console.warn('Failed to play times up announcement:', error);
    }
  }, [isMuted, volume]);

  const announceGameComplete = useCallback(async () => {
    if (isMuted) return;
    
    try {
      const text = GameAnnouncements.gameComplete();
      await playGeneratedSpeech(text, volume);
    } catch (error) {
      console.warn('Failed to play game complete announcement:', error);
    }
  }, [isMuted, volume]);

  // Initialize audio on first use
  useState(() => {
    preloadSounds();
  });

  return {
    playSound,
    playMusic,
    stopMusic,
    announce,
    announceCountdown,
    announcePlayerFoundBall,
    announcePlayerInLead,
    announceRoundComplete,
    announceTimesUp,
    announceGameComplete,
    isMuted,
    setIsMuted,
    volume,
    setVolume
  };
};
