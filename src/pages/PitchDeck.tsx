import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Save, Share2, Plus, Trash2, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AtomLoader } from "@/components/ui/AtomLoader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { downloadPitchDeckPdf, PitchSection } from "@/utils/pitchDeckPdf";

interface DeckRow {
  id: string;
  user_id: string;
  title: string;
  category: string | null;
  sections: PitchSection[];
  is_public: boolean;
  share_token: string | null;
}

export default function PitchDeck() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [deck, setDeck] = useState<DeckRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase.from("pitch_decks").select("*").eq("id", id).single();
      if (error || !data) {
        toast({ title: "Not found", variant: "destructive" });
        navigate(-1);
        return;
      }
      setDeck({
        ...(data as any),
        sections: Array.isArray((data as any).sections) ? (data as any).sections : [],
      });
      setLoading(false);
    })();
  }, [id]);

  const isOwner = user && deck && user.id === deck.user_id;

  const updateSection = (idx: number, patch: Partial<PitchSection>) => {
    if (!deck) return;
    const next = [...deck.sections];
    next[idx] = { ...next[idx], ...patch };
    setDeck({ ...deck, sections: next });
  };

  const updateBullet = (sIdx: number, bIdx: number, value: string) => {
    if (!deck) return;
    const next = [...deck.sections];
    const bullets = [...next[sIdx].bullets];
    bullets[bIdx] = value;
    next[sIdx] = { ...next[sIdx], bullets };
    setDeck({ ...deck, sections: next });
  };

  const addBullet = (sIdx: number) => {
    if (!deck) return;
    const next = [...deck.sections];
    next[sIdx] = { ...next[sIdx], bullets: [...next[sIdx].bullets, ""] };
    setDeck({ ...deck, sections: next });
  };

  const removeBullet = (sIdx: number, bIdx: number) => {
    if (!deck) return;
    const next = [...deck.sections];
    const bullets = next[sIdx].bullets.filter((_, i) => i !== bIdx);
    next[sIdx] = { ...next[sIdx], bullets };
    setDeck({ ...deck, sections: next });
  };

  const save = async () => {
    if (!deck || !isOwner) return;
    setSaving(true);
    const { error } = await supabase
      .from("pitch_decks")
      .update({ title: deck.title, sections: deck.sections as any })
      .eq("id", deck.id);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved" });
    }
  };

  const toggleShare = async () => {
    if (!deck || !isOwner) return;
    const next = !deck.is_public;
    const token = next ? deck.share_token || crypto.randomUUID().replace(/-/g, "") : deck.share_token;
    const { error } = await supabase
      .from("pitch_decks")
      .update({ is_public: next, share_token: token })
      .eq("id", deck.id);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    setDeck({ ...deck, is_public: next, share_token: token });
    if (next) {
      const url = `${window.location.origin}/pitch-deck/${deck.id}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      toast({ title: "Public link copied", description: url });
    } else {
      toast({ title: "Made private" });
    }
  };

  const downloadPdf = () => {
    if (!deck) return;
    downloadPitchDeckPdf({
      title: deck.title,
      category: deck.category,
      sections: deck.sections,
    });
  };

  if (loading) return <AtomLoader fullScreen size={88} label="Loading deck..." />;
  if (!deck) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-40">
        <div className="px-4 py-3 max-w-4xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Pitch Deck</p>
            <p className="font-semibold truncate">{deck.title}</p>
          </div>
          {isOwner && (
            <Button variant="ghost" size="sm" onClick={toggleShare} title={deck.is_public ? "Make private" : "Make public"}>
              {deck.is_public ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            </Button>
          )}
          {isOwner && (
            <Button variant="ghost" size="sm" onClick={save} disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? "..." : "Save"}
            </Button>
          )}
          <Button size="sm" onClick={downloadPdf}>
            <Download className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Title card */}
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline">Cover</Badge>
            {deck.category && <Badge>{deck.category}</Badge>}
          </div>
          {isOwner ? (
            <Input
              className="text-3xl font-bold border-none px-0 focus-visible:ring-0 h-auto"
              value={deck.title}
              onChange={(e) => setDeck({ ...deck, title: e.target.value })}
            />
          ) : (
            <h1 className="text-3xl font-bold">{deck.title}</h1>
          )}
        </div>

        {/* Sections */}
        {deck.sections.map((section, sIdx) => (
          <div key={section.key + sIdx} className="bg-card rounded-2xl p-6 border border-border shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <Badge variant="secondary" className="text-xs">{sIdx + 1} / {deck.sections.length}</Badge>
            </div>
            {isOwner ? (
              <Input
                className="text-2xl font-bold border-none px-0 focus-visible:ring-0 h-auto mb-4"
                value={section.title}
                onChange={(e) => updateSection(sIdx, { title: e.target.value })}
              />
            ) : (
              <h2 className="text-2xl font-bold mb-4">{section.title}</h2>
            )}
            <ul className="space-y-2">
              {section.bullets.map((bullet, bIdx) => (
                <li key={bIdx} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  {isOwner ? (
                    <>
                      <Textarea
                        rows={1}
                        value={bullet}
                        onChange={(e) => updateBullet(sIdx, bIdx, e.target.value)}
                        className="flex-1 min-h-0 resize-none border-none focus-visible:ring-0 px-0 py-1 text-base"
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeBullet(sIdx, bIdx)} className="h-7 w-7 shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <span className="flex-1">{bullet}</span>
                  )}
                </li>
              ))}
            </ul>
            {isOwner && (
              <Button variant="ghost" size="sm" onClick={() => addBullet(sIdx)} className="mt-3">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add bullet
              </Button>
            )}
          </div>
        ))}

        <p className="text-center text-xs text-muted-foreground py-6">
          Made with IDESTRIM — Share Your Innovation
        </p>
      </div>
    </div>
  );
}
