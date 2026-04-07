import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user with anon client
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { confirmation } = await req.json();
    if (confirmation !== "DELETE_MY_ACCOUNT") {
      return new Response(JSON.stringify({ error: "Invalid confirmation" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to delete user data and auth account
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const userId = user.id;

    // Delete user data from public tables (cascade handles some, but be thorough)
    await adminClient.from("media_likes").delete().eq("user_id", userId);
    await adminClient.from("media_saves").delete().eq("user_id", userId);
    await adminClient.from("media_comments").delete().eq("user_id", userId);
    await adminClient.from("media_views").delete().eq("user_id", userId);
    await adminClient.from("notifications").delete().or(`user_id.eq.${userId},actor_id.eq.${userId}`);
    await adminClient.from("followers").delete().or(`follower_id.eq.${userId},following_id.eq.${userId}`);
    await adminClient.from("messages").delete().eq("sender_id", userId);
    await adminClient.from("conversations").delete().or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`);
    await adminClient.from("live_link_likes").delete().eq("user_id", userId);
    await adminClient.from("live_link_saves").delete().eq("user_id", userId);
    await adminClient.from("live_link_comments").delete().eq("user_id", userId);
    await adminClient.from("live_links").delete().eq("user_id", userId);
    await adminClient.from("media_uploads").delete().eq("user_id", userId);
    await adminClient.from("premium_subscriptions").delete().eq("user_id", userId);
    await adminClient.from("webscan_subscriptions").delete().eq("user_id", userId);
    await adminClient.from("idemark_records").delete().eq("user_id", userId);
    await adminClient.from("idescan_scans").delete().eq("user_id", userId);
    await adminClient.from("group_members").delete().eq("user_id", userId);
    await adminClient.from("profiles").delete().eq("user_id", userId);

    // Delete auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError);
      return new Response(JSON.stringify({ error: "Failed to delete account" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Delete account error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
