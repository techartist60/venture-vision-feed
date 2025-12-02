import { useState } from 'react';
import { Shield, Download, ExternalLink, Copy, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  IdemarkData, 
  formatFingerprintShort, 
  formatIdemarkTimestamp,
  downloadCertificate 
} from '@/utils/idemark';

interface IdemarkSuccessDialogProps {
  open: boolean;
  onClose: () => void;
  idemarkData: IdemarkData | null;
}

export default function IdemarkSuccessDialog({
  open,
  onClose,
  idemarkData,
}: IdemarkSuccessDialogProps) {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!idemarkData) return null;

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({
      title: "Copied!",
      description: `${field} copied to clipboard`,
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadCertificate = () => {
    downloadCertificate(idemarkData);
    toast({
      title: "Certificate Downloaded",
      description: "Your Idemark certificate has been saved",
    });
  };

  const handleViewVerification = () => {
    window.open(`/idemark/verify/${idemarkData.idemarkId}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-full bg-gradient-to-br from-primary to-accent">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle className="text-xl">Idea Validated!</DialogTitle>
              <DialogDescription>
                Your idea has been marked with Idemark
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Idea Title */}
          <div className="p-4 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl border border-primary/20">
            <p className="text-xs text-muted-foreground mb-1">Idea Title</p>
            <p className="font-semibold text-foreground">{idemarkData.title}</p>
          </div>

          {/* Details Grid */}
          <div className="grid gap-3">
            {/* Idemark ID */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Idemark ID</p>
                <p className="font-mono text-sm font-medium text-foreground">
                  {idemarkData.idemarkId}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleCopy(idemarkData.idemarkId, 'Idemark ID')}
              >
                {copiedField === 'Idemark ID' ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Timestamp */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Timestamp</p>
              <p className="text-sm font-medium text-foreground">
                {formatIdemarkTimestamp(idemarkData.timestamp)}
              </p>
            </div>

            {/* Fingerprint Hash */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Fingerprint Hash</p>
                <p className="font-mono text-sm font-medium text-foreground truncate">
                  {formatFingerprintShort(idemarkData.fingerprintHash)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={() => handleCopy(idemarkData.fingerprintHash, 'Fingerprint')}
              >
                {copiedField === 'Fingerprint' ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center justify-center">
            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
              <Check className="h-3 w-3 mr-1" />
              Validated & Secured
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleDownloadCertificate}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Certificate
            </Button>
            <Button
              variant="innovation"
              onClick={handleViewVerification}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Verify Page
            </Button>
          </div>

          {/* Close Button */}
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full"
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
