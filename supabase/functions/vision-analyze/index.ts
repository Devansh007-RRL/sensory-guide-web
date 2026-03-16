import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image, nightMode, previousDescription } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are an AI assistant helping a visually impaired person understand their surroundings through a camera feed. Analyze the image and provide a concise, clear description focused on:

1. **Obstacles**: Objects that could block the path (furniture, walls, poles, steps, etc.) with approximate distance
2. **People/Crowds**: Number of people visible, whether it's crowded
3. **Currency**: If any banknotes or coins are visible, identify them (Indian Rupees)
4. **Environment**: Indoor/outdoor, lighting conditions${nightMode ? ", note this is night mode with enhanced brightness" : ""}
5. **Safety**: Any potential hazards

Keep descriptions under 3 sentences. Be direct and practical. Example: "Two people ahead about 3 meters away. A chair on your left about 1 meter. Clear path to the right."

${previousDescription ? `IMPORTANT: The previous description was: "${previousDescription}". Compare carefully with what you see NOW. Only respond with EXACTLY "NO_CHANGE" (nothing else) if the scene is virtually identical - same objects in same positions, same number of people, same environment. If ANYTHING has visibly changed (different objects, people moved, items added/removed, different angle, different lighting), provide a full new description. When in doubt, provide a new description rather than saying NO_CHANGE.` : "This is the first analysis - provide a full description."}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Describe what you see in this camera frame for a visually impaired person." },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content || "Could not analyze the scene.";

    return new Response(JSON.stringify({ description }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("vision-analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
