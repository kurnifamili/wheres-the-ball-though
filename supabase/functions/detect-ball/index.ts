import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders, handleCors } from "../_shared/cors.ts"

interface DetectBallRequest {
  imageUrl: string
}

interface BoundingBox {
  x_min: number
  y_min: number
  x_max: number
  y_max: number
}

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const { imageUrl }: DetectBallRequest = await req.json()

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "Image URL is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      )
    }

    // Get GEMINI_API_KEY from Supabase secrets
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      )
    }

    // Download image and convert to base64
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to download image" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      )
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)))

    // Gemini Vision API prompt
    const geminiPrompt = `You are analyzing a "Where's Waldo" style illustration. Your task is to locate the SINGLE red ball in this image.

Return ONLY a JSON object with the bounding box coordinates as percentages (0.0 to 1.0) of the image dimensions:
{
  "x_min": <left edge as percentage>,
  "y_min": <top edge as percentage>,
  "x_max": <right edge as percentage>,
  "y_max": <bottom edge as percentage>
}

IMPORTANT: 
- Make the bounding box slightly larger than the ball itself (about 20% of image width/height) to be forgiving
- x_min is the left edge, x_max is the right edge
- y_min is the top edge, y_max is the bottom edge
- Return ONLY valid JSON, no other text`

    // Call Gemini Vision API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { text: geminiPrompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }]
        }),
      }
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Gemini API error:', geminiResponse.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: `Gemini API error: ${geminiResponse.status}`,
          details: errorText 
        }),
        { 
          status: geminiResponse.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      )
    }

    const geminiResult = await geminiResponse.json()
    
    if (!geminiResult.candidates || !geminiResult.candidates[0] || !geminiResult.candidates[0].content) {
      return new Response(
        JSON.stringify({ error: "Invalid response from Gemini API" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      )
    }

    const responseText = geminiResult.candidates[0].content.parts[0].text
    console.log('Gemini Vision API response:', responseText)
    
    // Extract JSON from response (handle potential markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: "Failed to parse ball location from Gemini response" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      )
    }
    
    const boundingBox: BoundingBox = JSON.parse(jsonMatch[0])
    console.log('Detected ball position:', boundingBox)

    return new Response(
      JSON.stringify({ 
        success: true,
        boundingBox
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    )

  } catch (error) {
    console.error('Detect ball error:', error)
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
