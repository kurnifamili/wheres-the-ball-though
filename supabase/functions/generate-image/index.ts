import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders, handleCors } from "../_shared/cors.ts"

interface GenerateImageRequest {
  prompt: string
  image_size?: string
  num_inference_steps?: number
}

interface FalAIResponse {
  images: Array<{
    url: string
    width: number
    height: number
  }>
  timings: {
    inference: number
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const { prompt, image_size = "square_hd", num_inference_steps = 28 }: GenerateImageRequest = await req.json()

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      )
    }

    // Get FAL_KEY from Supabase secrets
    const falKey = Deno.env.get('FAL_KEY')
    if (!falKey) {
      return new Response(
        JSON.stringify({ error: "FAL_KEY not configured" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      )
    }

    // Call fal.ai API
    const falResponse = await fetch("https://fal.run/fal-ai/nano-banana", {
      method: "POST",
      headers: {
        "Authorization": `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        image_size,
        num_inference_steps,
      }),
    })

    if (!falResponse.ok) {
      const errorText = await falResponse.text()
      console.error('Fal.ai API error:', falResponse.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: `Fal.ai API error: ${falResponse.status}`,
          details: errorText 
        }),
        { 
          status: falResponse.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      )
    }

    const result: FalAIResponse = await falResponse.json()

    if (!result.images || result.images.length === 0) {
      return new Response(
        JSON.stringify({ error: "No images generated" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      )
    }

    // Return the first generated image
    const imageUrl = result.images[0].url

    return new Response(
      JSON.stringify({ 
        success: true,
        imageUrl,
        width: result.images[0].width,
        height: result.images[0].height,
        timings: result.timings
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    )

  } catch (error) {
    console.error('Generate image error:', error)
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
