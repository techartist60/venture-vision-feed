import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Download, Plus, Globe, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AtomLoader } from "@/components/ui/AtomLoader";
import { PitchDeckDialog } from "./PitchDeckDialog";
import { downloadPitchDeckPdf } from "@/utils/pitchDeckPdf";

interface Props {
  userId?: string;
  isOwnProfile: boolean;
}

export function PitchDecksTab({ userId, isOwnProfile }: Props) {
  const [decks, setDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const fetchDecks = async () => {
    if (!userId) return;
    setLoading(true);
    let q = supabase.from("pitch_decks").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (!isOwnProfile) q = q.eq("is_public", true);
    const { data } = await q;
    setDecks(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchDecks(); }, [userId, isOwnProfile]);

  if (loading) return <div className="py-8 flex justify-center"><AtomLoader size={56} /></div>;

  return (
    <div className="space-y-3">
      {isOwnProfile && (
        <Button onClick={() => setOpen(true)} className="w-full">
          <Plus className="h-4 w-4 mr-1" /> New Pitch Deck
        </Button>
      )}

      {decks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No pitch decks yet</p>
        </div>
      ) : (
        decks.map((d) => (
          <div key={d.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:shadow-md transition">
            <div className="p-3 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <Link to={`/pitch-deck/${d.id}`} className="flex-1 min-w-0">
              <p className="font-semibold truncate">{d.title}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {d.category && <Badge variant="outline" className="text-[10px]">{d.category}</Badge>}
                <span>{new Date(d.created_at).toLocaleDateString()}</span>
                {d.is_public ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => downloadPitchDeckPdf({ title: d.title, category: d.category, sections: d.sections || [] })}
              title="Download PDF"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        ))
      )}

      <PitchDeckDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) fetchDecks(); }} />
    </div>
  );
}
