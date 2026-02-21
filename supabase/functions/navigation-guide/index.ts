import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { destination } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a navigation assistant for visually impaired people in India. The user wants directions to a place. Provide clear, step-by-step walking/travel directions.

Rules:
- Give practical, real directions based on your knowledge of Indian cities and landmarks
- Include mode of transport suggestions (walking, auto-rickshaw, bus, metro, train)
- Mention landmarks as reference points (temples, shops, stations, etc.)
- Keep each step short and clear for voice reading
- Include approximate distances and times
- If the destination is vague, ask for clarification in step 1
- Maximum 10 steps
- Start from a general city center or major landmark if no origin is specified

Return a JSON object with a "steps" array of strings. Each string is one navigation step.
Example: {"steps": ["Start from the main road near the bus station.", "Walk straight for about 200 meters towards the temple.", "Turn left at the temple junction."]}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `I want to go to: ${destination}. Please give me step-by-step directions.` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_directions",
              description: "Provide step-by-step navigation directions",
              parameters: {
                type: "object",
                properties: {
                  steps: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of navigation step strings",
                  },
                },
                required: ["steps"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_directions" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error("Navigation AI failed");
    }

    const data = await response.json();
    
    // Extract from tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      const args = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ steps: args.steps }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback to message content
    const content = data.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify({ message: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("navigation-guide error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
