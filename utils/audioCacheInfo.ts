// Utility to help with file management for ElevenLabs audio caching
// This file provides instructions for manually saving audio files

export const AUDIO_CACHE_INFO = {
  // Instructions for manual file management
  instructions: `
    ElevenLabs Audio Caching Instructions:
    
    1. When audio is generated, it will be downloaded to your Downloads folder
    2. Move the downloaded files to: public/audio/voice/
    3. Files are named: voice_[text]_[settings].mp3
    
    Example:
    - Downloaded: voice_Go__stability_0_6_similarity_boost_0_8.mp3
    - Move to: public/audio/voice/voice_Go__stability_0_6_similarity_boost_0_8.mp3
    - Access via: /audio/voice/voice_Go__stability_0_6_similarity_boost_0_8.mp3
  `,
  
  // Get the expected filename for a given text and settings
  getFilename: (text: string, voiceSettings: any) => {
    const settingsStr = JSON.stringify(voiceSettings);
    const cacheKey = `${text}_${settingsStr}`.replace(/[^a-zA-Z0-9]/g, '_');
    return `voice_${cacheKey}.mp3`;
  },
  
  // Get the public URL for a cached file
  getPublicUrl: (filename: string) => {
    return `/audio/voice/${filename}`;
  }
};

// Log cache information to console
export const logCacheInfo = (text: string, voiceSettings: any) => {
  const filename = AUDIO_CACHE_INFO.getFilename(text, voiceSettings);
  const publicUrl = AUDIO_CACHE_INFO.getPublicUrl(filename);
  
  console.log('📁 Audio Cache Info:');
  console.log(`   Text: "${text}"`);
  console.log(`   Filename: ${filename}`);
  console.log(`   Public URL: ${publicUrl}`);
  console.log(`   Save to: public/audio/voice/${filename}`);
};
