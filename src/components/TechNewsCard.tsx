import { ExternalLink, Newspaper } from 'lucide-react';
import { BadgeCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import idestrimLogo from '@/assets/idestrim-logo.png';

export interface TechNewsItem {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  source_name: string | null;
  source_url: string;
  published_for: string;
}

export const TechNewsCard = ({ item }: { item: TechNewsItem }) => {
  const open = () => window.open(item.source_url, '_blank', 'noopener,noreferrer');

  return (
    <Card className="overflow-hidden border-border bg-card">
      <div className="flex items-center gap-3 p-4">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
          <img src={idestrimLogo} alt="Idestrim News" className="h-7 w-7 object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold truncate">Idestrim News</span>
            <BadgeCheck className="h-4 w-4 text-primary shrink-0" />
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {item.source_name || 'Tech News'} ·{' '}
            {new Date(item.published_for).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </p>
        </div>
        <Badge variant="secondary" className="gap-1 shrink-0">
          <Newspaper className="h-3 w-3" />
          Daily Tech
        </Badge>
      </div>

      {item.image_url && (
        <button type="button" onClick={open} className="block w-full">
          <img
            src={item.image_url}
            alt={item.title}
            loading="lazy"
            className="w-full aspect-video object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        </button>
      )}

      <div className="p-4 space-y-2">
        <h3 className="font-semibold leading-snug">{item.title}</h3>
        {item.description && (
          <p className="text-sm text-muted-foreground line-clamp-4">{item.description}</p>
        )}
        <button
          type="button"
          onClick={open}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Read full story
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
    </Card>
  );
};

export default TechNewsCard;
