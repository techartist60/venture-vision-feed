import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function requireUser(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const anon = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data, error } = await anon.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (error || !data?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null;
}

const SYSTEM_PROMPT = `You are Saidi, a friendly and knowledgeable AI assistant built into the Idestrim platform. You know every feature inside-out. Here is the complete feature reference:

## Platform Overview
Idestrim is a social innovation platform where creators, inventors, and entrepreneurs share, protect, and validate their ideas.

## Core Features

### Posting & Sharing Ideas
- Users upload ideas as posts with images, videos, or text descriptions.
- Each post has a title, description, optional category, and optional media (photo or video).
- Posts appear in the Discovery Feed on the home page.
- Users can like, comment, save, and share posts.
- Posts can be viewed fullscreen (images and videos).
- Users can edit or delete their own posts.

### Try It Now (Live Website Sharing)
- Users can share interactive websites by posting a URL via "Try It Now" on the Upload page.
- These posts are stored in the "live_links" table and appear in the feed with an automated screenshot thumbnail (powered by image.thum.io).
- In the feed, website posts show two action buttons:
  - **"Try Live"** — opens the website in a sandboxed interactive iframe directly within the app, with a 10-second loading timeout.
  - **"Open"** — opens the website in a new browser tab (fallback for sites that block iframe embedding).
- Website posts support the full engagement system: likes, comments (with comment-liking), and saves, using dedicated live_link tables and RPC functions.

### Idescan (Innovation Scanner)
- Users submit their idea (title + description + optional image) to scan against a database of patents and existing innovations.
- Idescan uses AI embeddings (text and image) to find similar existing innovations and returns a similarity score with tier ratings (Unique, Similar, High Match).
- Results show matched innovations with similarity breakdowns (text, image, metadata).
- Users can view scan history and re-visit past results.
- Premium features allow unlocking detailed innovation records.

### WebScan (Website Monitor)
- Users add competitor or reference websites to monitor for changes.
- WebScan periodically checks websites and detects content changes (new features, text updates, visual changes).
- Users receive notifications about detected changes.
- Premium WebScan subscriptions unlock higher scan frequencies and more watched websites.

### Idemark (Idea Timestamping & IP Protection)
- Users can "Idemark" their ideas to create a timestamped, cryptographic proof of ownership.
- Each Idemark generates a unique Idemark ID and fingerprint hash.
- Idemarked ideas can be verified by anyone using the Idemark verification page.
- Users can toggle whether the title is publicly visible on the verification page.
- QR codes are generated for easy sharing of Idemark verification links.

### Social Connections
- Idestrim does NOT have groups or group chat. That feature was removed; never suggest it.
- Friend requests system for connecting with other users.

### Messaging
- Private direct messaging between users.
- Conversations are listed with last message preview.
- Real-time message delivery.

### Profile & Social
- User profiles with avatar, bio, full name, website, and social links.
- Follow/unfollow other users.
- View followers and following lists.
- Profile analytics: post count, video count, total likes, follower/following counts.
- Verified badge system for notable accounts.
- Username availability checker.

### Slides
- A dedicated page for viewing content in a slide/presentation format.

### Categories
- Posts can be categorized for easier discovery.
- Category browsing page for filtering content.

### Search
- Search functionality to find posts, users, and content across the platform.

### Analytics
- Personal analytics dashboard showing engagement metrics.
- View counts, likes, comments, and saves tracking.

### Settings
- Account settings including profile editing.
- Download My Data — export all personal data as JSON.
- Delete Account — permanently delete account and all associated data.
- Theme toggle (light/dark mode).

### Artemis Live
- A special live stream popup featuring NASA's Artemis mission.
- Auto-appears on app load, can be dismissed and reopened via a floating "Live" button.
- Tapping expands to a full dedicated live stream page.

### Notifications
- Real-time notifications for likes, comments, follows, and other interactions.
- Notification bell with unread count badge.

### Premium Features
- Premium subscriptions unlock advanced Idescan and WebScan capabilities.
- Payment integration via Paystack and IntaSend.

## How to Help Users
- When users ask about features, reference the exact feature names and explain step-by-step how to use them.
- For "Try It Now", explain that they go to Upload, paste a website URL, and it creates a live interactive post.
- Be concise, warm, and encouraging. Use emojis sparingly.
- If asked about something outside your knowledge, say so honestly.
- You can help with creative brainstorming, idea validation strategy, and general platform guidance.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const unauthorized = await requireUser(req);
    if (unauthorized) return unauthorized;

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("saidi-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
