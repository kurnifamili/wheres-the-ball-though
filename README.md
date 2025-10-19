# Where's The Ball - AI-Powered Multiplayer Game
A multiplayer "Where's Waldo" style game powered by AI image generation and ball detection. Players compete to find a hidden red ball in complex Singaporean hawker centre scenes.

## 🎮 Features

### Core Gameplay
- **AI-Generated Images**: Complex "Where's Waldo" style scenes with hidden red balls
- **Smart Ball Detection**: AI-powered ball location detection using Gemini Vision
- **Timer System**: 30-second rounds with score multipliers based on speed
- **Voice Announcements**: ElevenLabs-powered voice feedback

### Multiplayer Mode
- **Room Creation**: Generate 6-digit PIN codes for multiplayer sessions
- **QR Code Sharing**: Easy room joining via QR codes
- **Real-Time Leaderboard**: Live score updates across all players
- **Solo Play**: Single-player mode with local scoring

### Technical Features
- **Secure API Keys**: All sensitive keys stored server-side in Supabase Edge Functions
- **Real-Time Updates**: Supabase real-time subscriptions for multiplayer
- **Responsive Design**: Works on desktop and mobile devices
- **Audio System**: Background music and sound effects

## 🚀 Quick Start

### Prerequisites
- Node.js
- Supabase account
- API keys for Gemini, fal.ai, and ElevenLabs

### Local Development

1. **Clone and install:**
   ```bash
   git clone <your-repo>
   cd wheres-the-ball-though
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp env.local.example .env.local
   # Edit .env.local with your API keys
   ```

3. **Run locally:**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Required API Keys

Create `.env.local` with:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_DB_PW=your_database_password_here

# API Keys for Edge Functions
GEMINI_API_KEY=your_gemini_api_key_here
FAL_KEY=your_fal_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

### Getting API Keys

1. **Gemini API**: https://makersuite.google.com/app/apikey
2. **fal.ai**: https://fal.ai/dashboard/keys
3. **ElevenLabs**: https://elevenlabs.io/app/settings/api-keys
4. **Supabase**: https://supabase.com/dashboard

## 🚀 Deployment

### Automated Deployment

The project includes a centralized deployment script that handles everything:

```bash
./deploy.sh
```

**What it does:**
- ✅ Reads configuration from `.env.local`
- ✅ Installs Supabase CLI if needed
- ✅ Logs into Supabase
- ✅ Links your project
- ✅ Sets all API secrets
- ✅ Deploys Edge Functions (Docker-based or direct)
- ✅ Provides Vercel deployment instructions

### Manual Deployment

If automated deployment fails:

1. **Set up Supabase:**
   - Create project at https://supabase.com/dashboard
   - Run database migrations in SQL editor
   - Deploy Edge Functions via Dashboard

2. **Deploy to Vercel:**
   - Import GitHub repository
   - Set environment variables:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
   - Deploy

## 🏗️ Architecture

### Frontend (Vercel)
- React + TypeScript + Vite
- Supabase client for database and real-time
- Calls Edge Functions for AI operations

### Backend (Supabase Edge Functions)
- **generate-image**: fal.ai integration for image generation
- **detect-ball**: Gemini Vision API for ball detection  
- **generate-speech**: ElevenLabs TTS for voice announcements

### Database (Supabase)
- **saved_images**: Cached generated images with ball positions
- **rooms**: Multiplayer room management
- **room_players**: Player scores and real-time updates

## 🎯 Game Modes

### Solo Play
- Single-player experience
- Local score tracking
- Practice mode for improving skills

### Multiplayer Rooms
- Create rooms with 6-digit PINs
- Share via QR code or PIN
- Real-time leaderboard updates
- Competitive scoring system

## 🔒 Security

- ✅ **API Keys**: Stored as Supabase secrets (server-side only)
- ✅ **Frontend**: Only public Supabase keys exposed
- ✅ **Edge Functions**: All AI API calls proxied through secure functions
- ✅ **Database**: Row Level Security (RLS) policies protect data

## 📊 Scoring System

- **Base Score**: 100 points per ball found
- **Time Bonus**: 10 points per second remaining
- **Example**: Finding ball in 3 seconds = 100 + (27 × 10) = 370 points

## 🛠️ Development

### Project Structure
```
├── components/          # React components
├── hooks/              # Custom React hooks
├── supabase/
│   ├── functions/      # Edge Functions
│   └── config.toml    # Supabase configuration
├── utils/              # Utility functions
├── migrations/         # Database migrations
└── deploy.sh          # Automated deployment script
```

### Key Technologies
- **Frontend**: React, TypeScript, Vite
- **Backend**: Supabase Edge Functions (Deno)
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini, fal.ai, ElevenLabs
- **Deployment**: Vercel (frontend), Supabase (backend)

## 🐛 Troubleshooting

### Common Issues

**Docker Issues:**
- Script automatically detects Docker availability
- Falls back to direct deployment if Docker unavailable

**Edge Functions Not Working:**
- Check secrets: `npx supabase secrets list`
- Check logs: `npx supabase functions logs generate-image`

**Frontend Errors:**
- Verify Vercel environment variables
- Check browser console for API errors

### Getting Help

1. Check the deployment logs
2. Verify all API keys are correct
3. Ensure Supabase project is properly configured
4. Check Vercel environment variables

## 📈 Cost Considerations

- **Supabase**: Free tier includes Edge Functions
- **Vercel**: Free tier for frontend hosting  
- **APIs**: Pay per usage (Gemini, fal.ai, ElevenLabs)- **Estimated**: Very low cost for typical usage

## 🎉 Success!

Once deployed, your game will be available at your Vercel URL with:
- ✅ Secure API key management
- ✅ Real-time multiplayer functionality
- ✅ AI-powered image generation and detection
- ✅ Voice announcements and sound effects
- ✅ Responsive design for all devices

Enjoy your AI-powered multiplayer game! 🚀
