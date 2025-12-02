import { Shield, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface IdemarkToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  isTitlePublic: boolean;
  onTitlePublicToggle: (isPublic: boolean) => void;
}

export default function IdemarkToggle({
  enabled,
  onToggle,
  isTitlePublic,
  onTitlePublicToggle,
}: IdemarkToggleProps) {
  return (
    <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl p-4 border border-primary/20 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-gradient-to-br from-primary to-accent">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">Secure with Idemark</h3>
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                Optional
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Create a digital fingerprint and timestamp to prove your idea's originality.
            </p>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          className="data-[state=checked]:bg-primary"
        />
      </div>

      {enabled && (
        <div className="pl-11 space-y-3 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground">Show title on verification page</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">
                    If enabled, your idea title will be visible on the public verification page.
                    The description remains private unless you share it.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Switch
              checked={isTitlePublic}
              onCheckedChange={onTitlePublicToggle}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>✓ Digital fingerprint (SHA-256 hash)</p>
            <p>✓ Verified timestamp</p>
            <p>✓ Downloadable certificate</p>
            <p>✓ Public verification page</p>
          </div>
        </div>
      )}
    </div>
  );
}
