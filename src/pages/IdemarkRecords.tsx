import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  ArrowLeft, 
  Download, 
  ExternalLink, 
  Trash2, 
  Clock,
  FileText,
  Search,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  formatFingerprintShort, 
  formatIdemarkTimestamp,
  downloadCertificate,
  IdemarkData 
} from '@/utils/idemark';

interface IdemarkRecord {
  id: string;
  idemark_id: string;
  title: string;
  description: string | null;
  category: string | null;
  fingerprint_hash: string;
  marked_at: string;
  is_title_public: boolean;
  status: string;
  created_at: string;
}

export default function IdemarkRecords() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<IdemarkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());

  const toggleIdVisibility = (recordId: string) => {
    setVisibleIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (user) {
      fetchRecords();
    }
  }, [user]);

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('idemark_records')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching Idemark records:', error);
        toast({
          title: "Error",
          description: "Failed to load your Idemark records",
          variant: "destructive"
        });
      } else {
        setRecords(data as IdemarkRecord[] || []);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (record: IdemarkRecord) => {
    setDeletingId(record.id);
    try {
      const { error } = await supabase
        .from('idemark_records')
        .delete()
        .eq('id', record.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete Idemark record",
          variant: "destructive"
        });
      } else {
        setRecords(prev => prev.filter(r => r.id !== record.id));
        toast({
          title: "Deleted",
          description: "Idemark record has been removed",
        });
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (record: IdemarkRecord) => {
    const idemarkData: IdemarkData = {
      idemarkId: record.idemark_id,
      fingerprintHash: record.fingerprint_hash,
      timestamp: record.marked_at,
      title: record.title,
      description: record.description || undefined,
      category: record.category || undefined,
    };
    downloadCertificate(idemarkData);
    toast({
      title: "Downloaded",
      description: "Certificate has been saved",
    });
  };

  const filteredRecords = records.filter(record =>
    record.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.idemark_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <Skeleton className="h-8 w-48" />
          </div>
        </header>
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/profile">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold">Idemark Records</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-6">
          <Badge variant="outline" className="gap-1">
            <Shield className="h-3 w-3" />
            {records.length} Total
          </Badge>
          <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30">
            {records.filter(r => r.status === 'active').length} Active
          </Badge>
        </div>

        {/* Records List */}
        {filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">
              {searchQuery ? 'No matching records' : 'No Idemark records yet'}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {searchQuery 
                ? 'Try a different search term' 
                : 'Your validated ideas will appear here'}
            </p>
            {!searchQuery && (
              <Button asChild variant="innovation">
                <Link to="/upload">
                  Create Your First Idemark
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className="bg-card rounded-xl border border-border p-4 space-y-3"
              >
                {/* Title & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                      <h3 className="font-semibold text-foreground truncate">
                        {record.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-mono text-muted-foreground">
                        {visibleIds.has(record.id) 
                          ? record.idemark_id 
                          : '••••••••-••••-••••-••••-••••••••••••'}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => toggleIdVisibility(record.id)}
                      >
                        {visibleIds.has(record.id) ? (
                          <EyeOff className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <Eye className="h-3 w-3 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Badge 
                    className={record.status === 'active' 
                      ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                      : 'bg-muted text-muted-foreground'
                    }
                  >
                    {record.status}
                  </Badge>
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(record.marked_at).toLocaleDateString()}
                  </span>
                  {record.category && (
                    <Badge variant="outline" className="text-xs">
                      {record.category}
                    </Badge>
                  )}
                  <span className="font-mono">
                    {formatFingerprintShort(record.fingerprint_hash)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleDownload(record)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Certificate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    asChild
                  >
                    <Link to={`/idemark/verify/${record.idemark_id}`} target="_blank">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Verify
                    </Link>
                  </Button>
                  <div className="flex-1" />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={deletingId === record.id}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Idemark Record?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this Idemark record. 
                          The verification page will no longer work and this action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(record)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
