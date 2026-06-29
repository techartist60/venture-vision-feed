import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SECTIONS = [
  { key: "title", title: "Title Slide" },
  { key: "problem", title: "Problem" },
  { key: "solution", title: "Solution" },
  { key: "market", title: "Market Opportunity" },
  { key: "how", title: "How It Works" },
  { key: "business_model", title: "Business Model" },
  { key: "advantage", title: "Competitive Advantage" },
  { key: "traction", title: "Traction" },
  { key: "vision", title: "Vision" },
  { key: "cta", title: "Call to Action" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    let { title, description, category, audience, monetization, website, ideaId } = body || {};
    if (!title || !description) {
      return new Response(JSON.stringify({ error: "title and description are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enrich context from the existing idea (if any) so AI tightly matches the post
    let ideaContext = "";
    if (ideaId) {
      try {
        const { data: media } = await anonClient
          .from("media_uploads")
          .select("title, description, category, media_type")
          .eq("id", ideaId)
          .maybeSingle();
        if (media) {
          ideaContext = `\nORIGINAL POST CONTEXT (must align with these details):\n- Post title: ${media.title || title}\n- Post description: ${media.description || description}\n- Post category: ${media.category || category || "n/a"}\n- Post media type: ${media.media_type || "n/a"}`;
          if (!category && media.category) category = media.category;
        } else {
          const { data: link } = await anonClient
            .from("live_links")
            .select("title, description, category, url")
            .eq("id", ideaId)
            .maybeSingle();
          if (link) {
            ideaContext = `\nORIGINAL POST CONTEXT (must align with these details):\n- Post title: ${link.title || title}\n- Post description: ${link.description || description}\n- Post category: ${link.category || category || "n/a"}\n- Linked website: ${link.url || website || "n/a"}`;
            if (!category && link.category) category = link.category;
            if (!website && link.url) website = link.url;
          }
        }
      } catch (e) {
        console.warn("idea context fetch failed", e);
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a startup pitch deck writer. Produce concise, investor-ready bullet points for each section. Every bullet MUST be directly grounded in and consistent with the provided idea description and post context — do NOT invent unrelated facts, products, markets, or features. If a detail is unknown, infer cautiously from the description and keep it generic. Use clear, simple, professional language. 3-5 short bullets per section. No markdown symbols.`;

    const userPrompt = `Create a pitch deck for this idea. Every section must reflect and stay faithful to the description below.
Title: ${title}
Description: ${description}
Category: ${category || "general"}
Target audience: ${audience || "not specified"}
Monetization: ${monetization || "not specified"}
Website: ${website || "n/a"}${ideaContext}

Generate bullets for: ${SECTIONS.map((s) => s.title).join(", ")}. Keep every bullet on-topic with the described idea.`;

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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "build_pitch_deck",
              description: "Return structured pitch deck content.",
              parameters: {
                type: "object",
                properties: {
                  sections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        key: { type: "string", enum: SECTIONS.map((s) => s.key) },
                        title: { type: "string" },
                        bullets: { type: "array", items: { type: "string" } },
                      },
                      required: ["key", "title", "bullets"],
                    },
                  },
                },
                required: ["sections"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "build_pitch_deck" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Lovable workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    let sections: any[] = [];
    if (toolCall?.function?.arguments) {
      try {
        sections = JSON.parse(toolCall.function.arguments).sections || [];
      } catch (e) {
        console.error("parse error", e);
      }
    }

    // Ensure all sections present in order
    const map = new Map(sections.map((s) => [s.key, s]));
    const ordered = SECTIONS.map((s) => {
      const found = map.get(s.key);
      return {
        key: s.key,
        title: found?.title || s.title,
        bullets: Array.isArray(found?.bullets) && found.bullets.length ? found.bullets : ["—"],
      };
    });

    return new Response(JSON.stringify({ sections: ordered }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-pitch-deck error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
