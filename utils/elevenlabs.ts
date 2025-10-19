// ElevenLabs API integration for voice generation
const BELLA_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Bella voice ID from ElevenLabs

import { logCacheInfo } from './audioCacheInfo';

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  stability: 0.6,
  similarity_boost: 0.8,
  style: 0.4,
  use_speaker_boost: true
};

// Cache for generated audio files
const audioCache = new Map<string, string>();

// Generate a cache key based on text and voice settings
const generateCacheKey = (text: string, voiceSettings: VoiceSettings): string => {
  const settingsStr = JSON.stringify(voiceSettings);
  return `${text}_${settingsStr}`.replace(/[^a-zA-Z0-9]/g, '_');
};

// Save audio buffer to file system
const saveAudioToFile = async (audioBuffer: ArrayBuffer, filename: string): Promise<string> => {
  const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
  
  // Create a download link to save the file
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Trigger download to save to Downloads folder
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Return a local file path for caching
  const localPath = `/audio/voice/${filename}`;
  return localPath;
};

// Check if audio file exists in public directory
const checkAudioFileExists = async (filename: string): Promise<boolean> => {
  try {
    const response = await fetch(`/audio/voice/${filename}`, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

export const generateSpeech = async (
  text: string, 
  voiceSettings: VoiceSettings = DEFAULT_VOICE_SETTINGS
): Promise<AudioBuffer> => {
  // Get Supabase URL and key from environment
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration not found. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  }

  console.log('Generating NEW audio for:', text);
  console.log('Voice settings:', voiceSettings);

  // Call Supabase Edge Function
  const response = await fetch(`${supabaseUrl}/functions/v1/generate-speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`
    },
    body: JSON.stringify({
      text,
      voiceSettings
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Edge Function error:', response.status, errorData);
    throw new Error(`Speech generation failed: ${errorData.error || 'Unknown error'}`);
  }

  const result = await response.json();
  
  if (!result.success || !result.audioBuffer) {
    throw new Error('Failed to generate speech from Edge Function response');
  }

  // Convert base64 audio back to ArrayBuffer
  const binaryString = atob(result.audioBuffer);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const audioBuffer = bytes.buffer;
  
  console.log('Edge Function response status:', response.status);
  console.log('Audio buffer size:', audioBuffer.byteLength, 'bytes');
  
  return audioBuffer;
};

export const playGeneratedSpeech = async (
  text: string,
  volume: number = 0.7,
  voiceSettings?: VoiceSettings
): Promise<void> => {
  try {
    const audioBuffer = await generateSpeech(text, voiceSettings);
    
    // Create blob with proper MIME type - try different formats
    let blob: Blob;
    try {
      // Try audio/mpeg first
      blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    } catch (e) {
      // Fallback to audio/mp3
      blob = new Blob([audioBuffer], { type: 'audio/mp3' });
    }
    
    const audioUrl = URL.createObjectURL(blob);
    
    // Create audio element
    const audio = new Audio();
    audio.src = audioUrl;
    audio.volume = volume;
    
    // Add comprehensive error handling
    audio.onerror = (e) => {
      console.error('Audio playback error:', e);
      console.error('Audio src:', audio.src);
      console.error('Audio readyState:', audio.readyState);
      console.error('Audio networkState:', audio.networkState);
      console.error('Blob type:', blob.type);
      console.error('Blob size:', blob.size);
      URL.revokeObjectURL(audioUrl);
    };
    
    // Clean up the blob URL after playing
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
    };
    
    // Wait for audio to be ready with timeout
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Audio loading timeout'));
      }, 10000); // 10 second timeout
      
      audio.oncanplaythrough = () => {
        clearTimeout(timeout);
        resolve(undefined);
      };
      audio.onerror = (e) => {
        clearTimeout(timeout);
        reject(e);
      };
      audio.load();
    });
    
    // Try to play the audio
    console.log('Attempting to play audio for:', text);
    console.log('Audio element readyState:', audio.readyState);
    console.log('Audio element networkState:', audio.networkState);
    console.log('Audio element src:', audio.src);
    console.log('Audio element volume:', audio.volume);
    
    // Ensure audio context is enabled
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        console.log('Audio context suspended, attempting to resume...');
        await audioContext.resume();
        console.log('Audio context resumed, state:', audioContext.state);
      }
    } catch (contextError) {
      console.warn('Failed to enable audio context:', contextError);
    }
    
    await audio.play();
    console.log('Successfully played generated speech:', text);
    
  } catch (error) {
    console.error('Failed to play generated speech:', error);
    // Fallback: could play a default sound or show a notification
    console.log('Falling back to console notification for:', text);
  }
};

// Predefined announcements for the game
export const GameAnnouncements = {
  countdown: (number: number) => {
    if (number === 0) return "Go!";
    return number.toString();
  },
  
  roundComplete: () => "Round complete!",
  
  playerFoundBall: (playerName: string) => `${playerName} found the ball!`,
  
  playerInLead: (playerName: string) => `${playerName} is in the lead!`,
  
  timesUp: () => "Time's up!",
  
  nextRound: () => "Next round starting soon!",
  
  gameStart: () => "Game starting!",
  
  gameComplete: () => "Game completed! Congratulations to all players!",
  
  welcome: () => "Welcome to Where's The Ball!"
};

// Preload common announcements to populate cache
export const preloadCommonAnnouncements = async (): Promise<void> => {
  const commonTexts = [
    "Go!",
    "3",
    "2", 
    "1",
    "Round complete!",
    "Time's up!",
    "Next round starting soon!",
    "Game starting!",
    "Game completed! Congratulations to all players!",
    "Welcome to Where's The Ball!"
  ];

  console.log('Preloading common announcements...');
  
  for (const text of commonTexts) {
    try {
      await generateSpeech(text);
      console.log(`Preloaded: "${text}"`);
    } catch (error) {
      console.warn(`Failed to preload "${text}":`, error);
    }
  }
  
  console.log('Common announcements preloaded!');
};
