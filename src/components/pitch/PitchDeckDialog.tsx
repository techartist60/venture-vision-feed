import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AtomLoader } from "@/components/ui/AtomLoader";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface PitchDeckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill?: {
    title?: string;
    description?: string;
    category?: string;
    website?: string;
    image_url?: string;
    video_url?: string;
    ideaId?: string;
  };
}

const CATEGORIES = [
  "Technology", "Health & Wellness", "Agriculture", "Education",
  "Fashion", "Art & Design", "Gaming", "Sustainability", "Finance", "Other",
];

export function PitchDeckDialog({ open, onOpenChange, prefill }: PitchDeckDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    audience: "",
    monetization: "",
    website: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        title: prefill?.title || "",
        description: prefill?.description || "",
        category: prefill?.category || "",
        audience: "",
        monetization: "",
        website: prefill?.website || "",
      });
    }
  }, [open, prefill]);

  const update = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleGenerate = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to generate a pitch deck.", variant: "destructive" });
      return;
    }
    if (!form.title.trim() || !form.description.trim()) {
      toast({ title: "Missing fields", description: "Title and description are required.", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-pitch-deck", {
        body: {
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category || null,
          audience: form.audience || null,
          monetization: form.monetization || null,
          website: form.website || null,
          ideaId: prefill?.ideaId || null,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const sections = (data as any)?.sections || [];

      const { data: deck, error: insErr } = await supabase
        .from("pitch_decks")
        .insert({
          user_id: user.id,
          idea_id: prefill?.ideaId || null,
          title: form.title.trim(),
          category: form.category || null,
          target_audience: form.audience || null,
          monetization: form.monetization || null,
          website_url: form.website || null,
          image_url: prefill?.image_url || null,
          video_url: prefill?.video_url || null,
          sections,
        })
        .select("id")
        .single();

      if (insErr) throw insErr;

      toast({ title: "Pitch deck created", description: "Your investor-ready deck is ready to edit." });
      onOpenChange(false);
      navigate(`/pitch-deck/${deck.id}`);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Generation failed", description: e?.message || "Try again later.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !generating && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Generate Pitch Deck
          </DialogTitle>
          <DialogDescription>
            Turn your idea into an investor-ready deck in seconds.
          </DialogDescription>
        </DialogHeader>

        {generating ? (
          <div className="py-10">
            <AtomLoader size={88} label="Crafting your pitch deck…" />
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label>Idea Name *</Label>
              <Input value={form.title} onChange={(e) => update("title", e.target.value)} maxLength={120} />
            </div>
            <div>
              <Label>Short Description *</Label>
              <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} maxLength={1000} rows={3} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => update("category", v)}>
                <SelectTrigger><SelectValue placeholder="Choose category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target Audience</Label>
              <Input value={form.audience} onChange={(e) => update("audience", e.target.value)} placeholder="e.g. small farmers in East Africa" />
            </div>
            <div>
              <Label>Monetization</Label>
              <Input value={form.monetization} onChange={(e) => update("monetization", e.target.value)} placeholder="e.g. subscription, marketplace fees" />
            </div>
            <div>
              <Label>Website URL</Label>
              <Input value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://…" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleGenerate}>
                <Sparkles className="h-4 w-4 mr-1" /> Generate
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
