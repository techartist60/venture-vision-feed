import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Shield, Check, X, Clock, Hash, FileText, ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { formatFingerprintShort, formatIdemarkTimestamp } from '@/utils/idemark';

interface IdemarkRecord {
  id: string;
  idemark_id: string;
  title: string;
  fingerprint_hash: string;
  marked_at: string;
  is_title_public: boolean;
  status: string;
  category: string | null;
}

export default function IdemarkVerify() {
  const { idemarkId } = useParams<{ idemarkId: string }>();
  const [record, setRecord] = useState<IdemarkRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecord = async () => {
      if (!idemarkId) {
        setError('Invalid Idemark ID');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('idemark_records')
          .select('*')
          .eq('idemark_id', idemarkId)
          .eq('status', 'active')
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching Idemark record:', fetchError);
          setError('Failed to verify Idemark');
        } else if (!data) {
          setError('Idemark not found or has been revoked');
        } else {
          setRecord(data as IdemarkRecord);
        }
      } catch (err) {
        console.error('Verification error:', err);
        setError('An error occurred during verification');
      } finally {
        setLoading(false);
      }
    };

    fetchRecord();
  }, [idemarkId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <Skeleton className="h-20 w-20 rounded-full mx-auto mb-4" />
            <Skeleton className="h-8 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <X className="h-10 w-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Verification Failed</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button asChild>
              <Link to="/">Go to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Idemark Verification</span>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Success Banner */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/25">
            <Check className="h-10 w-10 text-white" />
          </div>
          <Badge className="bg-green-500/10 text-green-600 border-green-500/30 mb-3">
            Verified & Authentic
          </Badge>
          <h1 className="text-2xl font-bold text-foreground mb-2">Idemark Verified</h1>
          <p className="text-muted-foreground">
            This idea has been validated and timestamped with Idemark
          </p>
        </div>

        {/* Details Card */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          {/* Gradient Top */}
          <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary" />

          <div className="p-6 space-y-6">
            {/* Idea Title */}
            {record.is_title_public && (
              <div className="p-4 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl border border-primary/20">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <FileText className="h-3 w-3" />
                  Idea Title
                </div>
                <p className="text-lg font-semibold text-foreground">{record.title}</p>
                {record.category && (
                  <Badge variant="outline" className="mt-2">
                    {record.category}
                  </Badge>
                )}
              </div>
            )}

            {/* Idemark ID */}
            <div className="p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Shield className="h-3 w-3" />
                Idemark ID
              </div>
              <p className="font-mono text-foreground font-medium">{record.idemark_id}</p>
            </div>

            {/* Timestamp */}
            <div className="p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Clock className="h-3 w-3" />
                Timestamp
              </div>
              <p className="text-foreground font-medium">
                {formatIdemarkTimestamp(record.marked_at)}
              </p>
            </div>

            {/* Fingerprint Hash */}
            <div className="p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Hash className="h-3 w-3" />
                Digital Fingerprint (SHA-256)
              </div>
              <p className="font-mono text-sm text-foreground break-all">
                {record.fingerprint_hash}
              </p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
          <h3 className="font-medium text-foreground mb-2">What does this mean?</h3>
          <p className="text-sm text-muted-foreground">
            This Idemark certificate proves that the idea existed at the recorded timestamp. 
            The digital fingerprint is a unique hash generated from the idea's content, 
            providing cryptographic proof of its originality and existence at that specific moment in time.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Want to protect your own ideas?
          </p>
          <Button asChild variant="innovation">
            <Link to="/upload">
              <Shield className="h-4 w-4 mr-2" />
              Create Your Idemark
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
