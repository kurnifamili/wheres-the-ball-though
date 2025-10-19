import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders, handleCors } from "../_shared/cors.ts"

interface GenerateSpeechRequest {
  text: string
  voiceSettings?: {
    stability: number
    similarity_boost: number
    style?: number
    use_speaker_boost?: boolean
  }
}

const DEFAULT_VOICE_SETTINGS = {
  stability: 0.6,
  similarity_boost: 0.8,
  style: 0.4,
  use_speaker_boost: true
}

const BELLA_VOICE_ID = "EXAVITQu4vr4xnSDxMaL" // Bella voice ID from ElevenLabs

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const { text, voiceSettings = DEFAULT_VOICE_SETTINGS }: GenerateSpeechRequest = await req.json()

    if (!text) {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      )
    }

    // Get ELEVENLABS_API_KEY from Supabase secrets
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY')
    if (!elevenLabsApiKey) {
      return new Response(
        JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      )
    }

    // Call ElevenLabs API
    const elevenLabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${BELLA_VOICE_ID}`, {
      method: "POST",
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenLabsApiKey
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: voiceSettings
      })
    })

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text()
      console.error('ElevenLabs API error:', elevenLabsResponse.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: `ElevenLabs API error: ${elevenLabsResponse.status}`,
          details: errorText 
        }),
        { 
          status: elevenLabsResponse.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      )
    }

    const audioBuffer = await elevenLabsResponse.arrayBuffer()
    
    console.log('ElevenLabs response status:', elevenLabsResponse.status)
    console.log('Audio buffer size:', audioBuffer.byteLength, 'bytes')

    // Convert audio buffer to base64 for JSON response
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))

    return new Response(
      JSON.stringify({ 
        success: true,
        audioBuffer: base64Audio,
        contentType: 'audio/mpeg',
        size: audioBuffer.byteLength
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    )

  } catch (error) {
    console.error('Generate speech error:', error)
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    )
  }
})
