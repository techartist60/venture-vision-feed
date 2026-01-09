import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';
import { Resend } from 'npm:resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WatchedWebsite {
  id: string;
  user_id: string;
  url: string;
  name: string;
  last_content_hash: string | null;
  last_checked_at: string | null;
  similarity_score: number;
}

interface ChangeDetected {
  type: string;
  summary: string;
  previousContent?: string;
  newContent?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { websiteId, userId } = await req.json();

    // If specific website ID provided, scan just that one
    // Otherwise, get all websites due for scanning
    let websitesToScan: WatchedWebsite[] = [];

    if (websiteId) {
      const { data, error } = await supabase
        .from('watched_websites')
        .select('*')
        .eq('id', websiteId)
        .eq('is_pinned', true)
        .single();

      if (error) throw error;
      if (data) websitesToScan = [data];
    } else {
      // Get all websites that need scanning (weekly = 7 days, daily = 1 day)
      const { data: subscriptions } = await supabase
        .from('user_subscription_tiers')
        .select('user_id, scan_frequency');

      const frequencyMap = new Map(
        (subscriptions || []).map(s => [s.user_id, s.scan_frequency])
      );

      const { data, error } = await supabase
        .from('watched_websites')
        .select('*')
        .eq('is_pinned', true);

      if (error) throw error;

      const now = new Date();
      websitesToScan = (data || []).filter(website => {
        if (!website.last_checked_at) return true;
        
        const lastChecked = new Date(website.last_checked_at);
        const frequency = frequencyMap.get(website.user_id) || 'weekly';
        const daysSinceCheck = (now.getTime() - lastChecked.getTime()) / (1000 * 60 * 60 * 24);
        
        return frequency === 'daily' ? daysSinceCheck >= 1 : daysSinceCheck >= 7;
      });
    }

    console.log(`Scanning ${websitesToScan.length} websites`);

    const results: { websiteId: string; status: string; changesDetected: boolean }[] = [];

    for (const website of websitesToScan) {
      try {
        console.log(`Scanning: ${website.url}`);

        // Scrape current content
        const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: website.url,
            formats: ['markdown'],
            onlyMainContent: true,
          }),
        });

        const scrapeData = await scrapeResponse.json();

        if (!scrapeResponse.ok || !scrapeData.success) {
          console.error(`Failed to scrape ${website.url}:`, scrapeData);
          results.push({ websiteId: website.id, status: 'failed', changesDetected: false });
          continue;
        }

        const currentContent = scrapeData.data?.markdown || scrapeData.markdown || '';
        const currentHash = await generateContentHash(currentContent);

        // Check for changes
        let changesDetected = false;
        const changes: ChangeDetected[] = [];

        if (website.last_content_hash && website.last_content_hash !== currentHash) {
          changesDetected = true;

          // Use AI to analyze what changed
          if (lovableApiKey) {
            const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${lovableApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [
                  {
                    role: 'system',
                    content: 'You analyze website changes and categorize them. Return JSON only.'
                  },
                  {
                    role: 'user',
                    content: `Analyze what changed on this website. Current content preview (first 3000 chars):
${currentContent.substring(0, 3000)}

Return a JSON array of detected changes:
[
  {"type": "content|pricing|features|pages", "summary": "Brief description of change"}
]

Focus on significant changes like pricing updates, new features, major content changes.`
                  }
                ],
                temperature: 0.2,
              }),
            });

            const analysisData = await analysisResponse.json();
            const changeText = analysisData.choices?.[0]?.message?.content || '[]';
            const cleanedChanges = changeText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            
            try {
              const detectedChanges = JSON.parse(cleanedChanges);
              changes.push(...detectedChanges);
            } catch {
              changes.push({ type: 'content', summary: 'Website content has been updated' });
            }
          } else {
            changes.push({ type: 'content', summary: 'Website content has been updated' });
          }

          // Store changes
          for (const change of changes) {
            await supabase.from('watched_website_changes').insert({
              watched_website_id: website.id,
              change_type: change.type,
              change_summary: change.summary,
              previous_content: website.last_content_hash ? 'Previous content hash: ' + website.last_content_hash : null,
              new_content: currentContent.substring(0, 500),
            });
          }

          // Create in-app notification
          await supabase.from('notifications').insert({
            user_id: website.user_id,
            type: 'webscan_update',
            title: `Website Update: ${website.name}`,
            message: changes.map(c => c.summary).join('; '),
            link: `/idescan/webscan/dashboard`,
          });

          // Send email notification if Resend is configured
          if (resendApiKey) {
            const resend = new Resend(resendApiKey);
            
            // Get user email
            const { data: userData } = await supabase.auth.admin.getUserById(website.user_id);
            
            if (userData?.user?.email) {
              await resend.emails.send({
                from: 'Idestrim WebScan <onboarding@resend.dev>',
                to: [userData.user.email],
                subject: `🔔 Website Update Detected: ${website.name}`,
                html: `
                  <h2>Website Change Detected</h2>
                  <p><strong>Website:</strong> ${website.name}</p>
                  <p><strong>URL:</strong> <a href="${website.url}">${website.url}</a></p>
                  <h3>Changes Detected:</h3>
                  <ul>
                    ${changes.map(c => `<li><strong>${c.type}:</strong> ${c.summary}</li>`).join('')}
                  </ul>
                  <p><a href="https://idestrim.com/idescan/webscan/dashboard">View Dashboard</a></p>
                `,
              });
            }
          }
        }

        // Update the watched website record
        await supabase
          .from('watched_websites')
          .update({
            last_checked_at: new Date().toISOString(),
            last_content_hash: currentHash,
            update_status: changesDetected ? 'updated' : 'no_change',
          })
          .eq('id', website.id);

        results.push({ websiteId: website.id, status: 'success', changesDetected });

      } catch (error) {
        console.error(`Error scanning ${website.url}:`, error);
        results.push({ websiteId: website.id, status: 'error', changesDetected: false });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('WebScan Monitor error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
