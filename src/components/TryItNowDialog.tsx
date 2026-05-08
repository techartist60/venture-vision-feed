import { useState } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getWebsiteThumbnailUrl } from '@/utils/websiteThumbnail';

const categories = [
  'Technology', 'Fashion', 'Agriculture', 'Art & Design',
  'Health & Wellness', 'Gaming', 'Education', 'Sustainability'
];

interface TryItNowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TryItNowDialog({ open, onOpenChange }: TryItNowDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValidUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to share a website.", variant: "destructive" });
      return;
    }
    if (!title.trim()) {
      toast({ title: "Title required", description: "Please enter a title for your idea.", variant: "destructive" });
      return;
    }
    if (!websiteUrl.trim() || !isValidUrl(websiteUrl.trim())) {
      toast({ title: "Invalid URL", description: "Please enter a valid website URL (https://...).", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('live_links').insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        website_url: websiteUrl.trim(),
        thumbnail_url: getWebsiteThumbnailUrl(websiteUrl.trim()),
        category: category || null,
      });

      if (error) throw error;

      toast({ title: "Published!", description: "Your website idea is now live for others to try." });
      setWebsiteUrl('');
      setTitle('');
      setDescription('');
      setCategory('');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error publishing website:', error);
      toast({ title: "Failed to publish", description: error.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Try It Now — Share a Website
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Share a website or web app so others can try it live inside Idestrim.
          </p>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Website URL *</label>
            <Input
              placeholder="https://your-project.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
            {websiteUrl && !isValidUrl(websiteUrl) && (
              <p className="text-xs text-destructive mt-1">Please enter a valid URL starting with http:// or https://</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Title *</label>
            <Input
              placeholder="Name your idea..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <Textarea
              placeholder="Briefly describe what this website does..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none h-20"
              maxLength={500}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat.toLowerCase()}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !websiteUrl.trim() || !isValidUrl(websiteUrl.trim()) || isSubmitting}
            className="w-full gap-2"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
            {isSubmitting ? 'Publishing...' : 'Publish Website Idea'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
