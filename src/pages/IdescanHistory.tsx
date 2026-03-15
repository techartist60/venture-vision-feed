import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Scan, Clock, Image as ImageIcon, FileText, Trash2, Plus, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


interface ScanMetadata {
  scan_type?: 'webscan' | 'idescan';
  scanned_url?: string;
  overall_similarity_score?: number;
  uniqueness_score?: number;
  similar_websites?: { name: string; url: string; description: string; similarityScore: number }[];
}

interface ScanRecord {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  status: string;
  created_at: string;
  metadata: ScanMetadata | null;
}

export default function IdescanHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scanToDelete, setScanToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchScans();
  }, [user, navigate]);

  const fetchScans = async () => {
    try {
      const { data, error } = await supabase
        .from('idescan_scans')
        .select('id, title, description, image_url, status, created_at, metadata')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScans((data || []).map(scan => ({
        ...scan,
        metadata: scan.metadata as ScanMetadata | null
      })));
    } catch (error) {
      console.error('Error fetching scans:', error);
      toast({
        title: "Error",
        description: "Failed to load scan history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!scanToDelete) return;

    try {
      const { error } = await supabase
        .from('idescan_scans')
        .delete()
        .eq('id', scanToDelete);

      if (error) throw error;

      setScans(scans.filter(s => s.id !== scanToDelete));
      toast({
        title: "Scan deleted",
        description: "Scan has been removed from your history",
      });
    } catch (error) {
      console.error('Error deleting scan:', error);
      toast({
        title: "Error",
        description: "Failed to delete scan",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setScanToDelete(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-500';
      case 'processing':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'failed':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-blue-500/10 text-blue-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-discovery pb-20">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border">
        <div className="px-4 py-4 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/idescan')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Clock className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Scan History</h1>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate('/idescan')}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Scan
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : scans.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Scan className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No scans yet</h3>
              <p className="text-muted-foreground mb-6">
                Start your first innovation scan to see results here
              </p>
              <Button onClick={() => navigate('/idescan')}>
                <Scan className="mr-2 h-4 w-4" />
                Start New Scan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {scans.map((scan) => {
              const isWebScan = scan.metadata?.scan_type === 'webscan';
              
              const handleCardClick = () => {
                if (isWebScan) {
                  navigate(`/idescan/webscan/results/${scan.id}`);
                } else {
                  navigate(`/idescan/results/${scan.id}`);
                }
              };
              
              return (
                <Card
                  key={scan.id}
                  className="hover:shadow-glow transition-all cursor-pointer"
                  onClick={handleCardClick}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {isWebScan ? (
                            <Globe className="h-4 w-4 text-primary" />
                          ) : (
                            <Scan className="h-4 w-4 text-primary" />
                          )}
                          <CardTitle className="text-lg">{scan.title}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {format(new Date(scan.created_at), 'PPp')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isLocked && <Crown className="h-4 w-4 text-amber-500" />}
                        <Badge className={getStatusColor(scan.status)}>
                          {scan.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setScanToDelete(scan.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    {scan.image_url && (
                      <div className="flex-shrink-0">
                        <img
                          src={scan.image_url}
                          alt={scan.title}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {scan.description}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        {scan.metadata?.scan_type === 'webscan' ? (
                          <>
                            <div className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              WebScan
                            </div>
                            {scan.metadata?.scanned_url && (
                              <span className="truncate max-w-[200px]">
                                {scan.metadata.scanned_url}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Text scan
                            </div>
                            {scan.image_url && (
                              <div className="flex items-center gap-1">
                                <ImageIcon className="h-3 w-3" />
                                Image scan
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      
                      {/* Subscribe button for locked WebScans */}
                      {isLocked && (
                        <Button
                          size="sm"
                          className="mt-3 gap-2"
                          variant="default"
                          onClick={handleSubscribeClick}
                        >
                          <Crown className="h-3 w-3" />
                          Subscribe Now
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this scan? This action cannot be undone and will remove all associated results.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}