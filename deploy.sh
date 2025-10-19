#!/bin/bash

# Centralized Deployment Script for Where's The Ball game
# Supports both Docker-based and API-based deployment

echo "🚀 Deploying Where's The Ball to Supabase + Vercel"
echo "=================================================="
echo ""

# Source configuration
source .env.local

# Extract project reference
PROJECT_REF=$(echo "$SUPABASE_URL" | sed 's|https://||' | sed 's|\.supabase\.co||')
echo "📋 Project: $PROJECT_REF"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found!"
    echo "Please create .env.local with your configuration:"
    echo "SUPABASE_URL=https://your-project-ref.supabase.co"
    echo "SUPABASE_ANON_KEY=your_supabase_anon_key_here"
    echo "GEMINI_API_KEY=your_gemini_key_here"
    echo "FAL_KEY=your_fal_key_here"
    echo "ELEVENLABS_API_KEY=your_elevenlabs_key_here"
    exit 1
fi

# Check if all required keys are present
if [ -z "$GEMINI_API_KEY" ] || [ -z "$FAL_KEY" ] || [ -z "$ELEVENLABS_API_KEY" ]; then
    echo "❌ Missing API keys in .env.local!"
    echo "Please ensure .env.local contains:"
    echo "GEMINI_API_KEY=your_gemini_key_here"
    echo "FAL_KEY=your_fal_key_here"
    echo "ELEVENLABS_API_KEY=your_elevenlabs_key_here"
    exit 1
fi

echo "✅ Found all API keys in .env.local"

# Check if database password is available (optional)
if [ -n "$SUPABASE_DB_PW" ]; then
    echo "✅ Found database password in .env.local"
else
    echo "⚠️  No SUPABASE_DB_PW found in .env.local (optional for Edge Functions)"
fi

# Check if Supabase CLI is installed
if ! npx supabase --version &> /dev/null; then
    echo "📦 Installing Supabase CLI..."
    npm install supabase
fi

# Check if user is logged in
if ! npx supabase projects list &> /dev/null; then
    echo "🔐 Please login to Supabase first:"
    npx supabase login
    if [ $? -ne 0 ]; then
        echo "❌ Login failed. Please try again."
        exit 1
    fi
fi

echo "📋 Current Supabase projects:"
npx supabase projects list

echo "🔗 Linking project..."
npx supabase link --project-ref $PROJECT_REF
if [ $? -ne 0 ]; then
    echo "❌ Failed to link project"
    exit 1
fi

echo "Setting secrets..."
npx supabase secrets set GEMINI_API_KEY="$GEMINI_API_KEY"
npx supabase secrets set FAL_KEY="$FAL_KEY"
npx supabase secrets set ELEVENLABS_API_KEY="$ELEVENLABS_API_KEY"

echo ""
echo "🚀 Deploying Edge Functions..."

# Try Docker-based deployment first
echo "🐳 Attempting Docker-based deployment..."

# Check if Docker is available
if docker info &> /dev/null; then
    echo "✅ Docker is running, using Docker-based deployment"
    
    echo "Deploying generate-image..."
    npx supabase functions deploy generate-image --no-verify-jwt
    if [ $? -ne 0 ]; then
        echo "❌ Failed to deploy generate-image function"
        echo "💡 Trying alternative deployment method..."
        npx supabase functions deploy generate-image --project-ref $PROJECT_REF
        if [ $? -ne 0 ]; then
            echo "❌ Alternative deployment also failed"
            exit 1
        fi
    fi

    echo "Deploying detect-ball..."
    npx supabase functions deploy detect-ball --no-verify-jwt
    if [ $? -ne 0 ]; then
        echo "❌ Failed to deploy detect-ball function"
        echo "💡 Trying alternative deployment method..."
        npx supabase functions deploy detect-ball --project-ref $PROJECT_REF
        if [ $? -ne 0 ]; then
            echo "❌ Alternative deployment also failed"
            exit 1
        fi
    fi

    echo "Deploying generate-speech..."
    npx supabase functions deploy generate-speech --no-verify-jwt
    if [ $? -ne 0 ]; then
        echo "❌ Failed to deploy generate-speech function"
        echo "💡 Trying alternative deployment method..."
        npx supabase functions deploy generate-speech --project-ref $PROJECT_REF
        if [ $? -ne 0 ]; then
            echo "❌ Alternative deployment also failed"
            exit 1
        fi
    fi

else
    echo "⚠️  Docker not available, trying direct deployment..."
    
    echo "Deploying generate-image..."
    npx supabase functions deploy generate-image --project-ref $PROJECT_REF
    if [ $? -ne 0 ]; then
        echo "❌ Failed to deploy generate-image function"
        echo "💡 Manual deployment required:"
        echo "1. Go to https://supabase.com/dashboard/project/$PROJECT_REF/functions"
        echo "2. Click 'Create a new function'"
        echo "3. Name: generate-image"
        echo "4. Upload: supabase/functions/generate-image/index.ts"
        exit 1
    fi

    echo "Deploying detect-ball..."
    npx supabase functions deploy detect-ball --project-ref $PROJECT_REF
    if [ $? -ne 0 ]; then
        echo "❌ Failed to deploy detect-ball function"
        echo "💡 Please upload manually via Supabase Dashboard"
        exit 1
    fi

    echo "Deploying generate-speech..."
    npx supabase functions deploy generate-speech --project-ref $PROJECT_REF
    if [ $? -ne 0 ]; then
        echo "❌ Failed to deploy generate-speech function"
        echo "💡 Please upload manually via Supabase Dashboard"
        exit 1
    fi
fi

echo ""
echo "✅ Edge Functions deployed successfully!"
echo ""
echo "🌐 Next steps for Vercel deployment:"
echo "   1. Go to https://vercel.com/dashboard"
echo "   2. Import your GitHub repository"
echo "   3. Set environment variables:"
echo "      VITE_SUPABASE_URL=$SUPABASE_URL"
echo "      VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY"
echo "   4. Deploy!"
echo ""
echo "📖 See DEPLOYMENT.md for detailed instructions"
