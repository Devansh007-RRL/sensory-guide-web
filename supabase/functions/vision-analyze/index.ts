const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      throw new Error("Invalid JSON payload");
    }

    const { image, nightMode, previousDescription } = body;
    
    if (!image) throw new Error("Image data is required");

    // Change 1: Get the official Gemini API Key from your environment variables
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    // Change 2: Handle the image data format for the native Gemini API
    // Gemini expects the raw base64 string and the mime type separately.
    let mimeType = "image/jpeg"; // Default fallback
    let base64Data = image;

    // If the client sends a data URL (e.g., "data:image/jpeg;base64,/9j/4AAQ..."), parse it
    if (image.startsWith("data:")) {
      const matches = image.match(/^data:([a-zA-Z0-9-+/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        base64Data = matches[2];
      } else {
        throw new Error("Invalid image data URL format");
      }
    }

    const systemPrompt = `You are an AI assistant helping a visually impaired person understand their surroundings through a camera feed. Analyze the image and provide a concise, clear description focused on:

1. **Obstacles**: Objects that could block the path (furniture, walls, poles, steps, etc.) with approximate distance
2. **People/Crowds**: Number of people visible, whether it's crowded
3. **Currency**: If any banknotes or coins are visible, identify them (Indian Rupees)
4. **Environment**: Indoor/outdoor, lighting conditions${nightMode ? ", note this is night mode with enhanced brightness" : ""}
5. **Safety**: Any potential hazards

Keep descriptions under 3 sentences. Be direct and practical. Example: "Two people ahead about 3 meters away. A chair on your left about 1 meter. Clear path to the right."

${previousDescription ? `IMPORTANT: The previous description was: "${previousDescription}". Compare carefully with what you see NOW. Only respond with EXACTLY "NO_CHANGE" (nothing else) if the scene is virtually identical - same objects in same positions, same number of people, same environment. If ANYTHING has visibly changed (different objects, people moved, items added/removed, different angle, different lighting), provide a full new description. When in doubt, provide a new description rather than saying NO_CHANGE.` : "This is the first analysis - provide a full description."}`;

    // Change 3: Call the official Google Gemini API endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    // Change 4: Use the native Gemini payload structure
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            role: "user",
            parts: [
              { text: "Describe what you see in this camera frame for a visually impaired person." },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 150,
        }
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);
      throw new Error(`AI analysis failed with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Change 5: Parse the native Gemini response structure
    const description = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Could not analyze the scene.";

    return new Response(JSON.stringify({ description }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (e) {
    console.error("vision-analyze error:", e);
    
    const status = e instanceof Error && (e.message.includes("JSON") || e.message.includes("required") || e.message.includes("format")) ? 400 : 500;
    
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});