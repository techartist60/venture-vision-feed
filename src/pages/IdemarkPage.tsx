import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Shield, Calendar, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

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
}

export default function IdemarkPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<IdemarkRecord[]>([]);
  const [loading, setLoading] = useState(true);

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
        .order('marked_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching idemark records:', error);
      toast.error('Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  const copyIdemarkId = async (idemarkId: string) => {
    await navigator.clipboard.writeText(idemarkId);
    toast.success('Idemark ID copied!');
  };

  const openVerificationPage = (idemarkId: string) => {
    navigate(`/idemark/verify/${idemarkId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-40">
        <div className="px-4 py-4 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">My Idemarks</h1>
              <p className="text-sm text-muted-foreground">Your protected ideas</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {records.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No Idemarks Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Protect your ideas by enabling Idemark when uploading
              </p>
              <Button onClick={() => navigate('/upload')}>
                Upload an Idea
              </Button>
            </CardContent>
          </Card>
        ) : (
          records.map((record) => (
            <Card key={record.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{record.title}</CardTitle>
                    {record.category && (
                      <Badge variant="secondary" className="mt-1">
                        {record.category}
                      </Badge>
                    )}
                  </div>
                  <Badge 
                    variant={record.status === 'active' ? 'default' : 'outline'}
                    className={record.status === 'active' ? 'bg-green-500' : ''}
                  >
                    {record.status}
                  </Badge>
                </div>
                {record.description && (
                  <CardDescription className="mt-2 line-clamp-2">
                    {record.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Idemark ID */}
                <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Idemark ID</p>
                    <p className="text-sm font-mono">{record.idemark_id}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => copyIdemarkId(record.idemark_id)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                {/* Date */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Protected on {new Date(record.marked_at).toLocaleDateString()}</span>
                </div>

                {/* Visibility */}
                <div className="flex items-center gap-2 text-sm">
                  <span className={record.is_title_public ? 'text-green-500' : 'text-yellow-500'}>
                    {record.is_title_public ? '🔓 Title Public' : '🔒 Title Private'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openVerificationPage(record.idemark_id)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Verify
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
