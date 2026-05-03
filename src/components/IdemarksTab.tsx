import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Calendar, Copy, ExternalLink } from 'lucide-react';
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

interface IdemarksTabProps {
  userId: string;
  isOwnProfile: boolean;
}

export function IdemarksTab({ userId, isOwnProfile }: IdemarksTabProps) {
  const navigate = useNavigate();
  const [records, setRecords] = useState<IdemarkRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecords();
  }, [userId]);

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('idemark_records')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('marked_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching idemark records:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyIdemarkId = async (idemarkId: string) => {
    await navigator.clipboard.writeText(idemarkId);
    toast.success('Idemark ID copied!');
  };

  if (loading) {
    const { AtomLoader } = require('@/components/ui/AtomLoader');
    return (
      <div className="flex items-center justify-center py-12">
        <AtomLoader size={64} />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">
            {isOwnProfile ? 'No Idemarks Yet' : 'No Public Idemarks'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {isOwnProfile 
              ? 'Protect your ideas by enabling Idemark when uploading'
              : 'This user has no public idemarked ideas'}
          </p>
          {isOwnProfile && (
            <Button onClick={() => navigate('/upload')}>
              Upload an Idea
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {records.map((record) => (
        <Card key={record.id} className="overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold">
                  {record.is_title_public ? record.title : '🔒 Private Title'}
                </h4>
                {record.category && (
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {record.category}
                  </Badge>
                )}
              </div>
              <Badge 
                variant="default"
                className="bg-green-500 text-xs"
              >
                <Shield className="h-3 w-3 mr-1" />
                Protected
              </Badge>
            </div>

            {record.is_title_public && record.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {record.description}
              </p>
            )}

            {/* Idemark ID */}
            <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Idemark ID</p>
                <p className="text-xs font-mono">{record.idemark_id}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => copyIdemarkId(record.idemark_id)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>

            {/* Date */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Protected on {new Date(record.marked_at).toLocaleDateString()}</span>
            </div>

            {/* Verify Button */}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => navigate(`/idemark/verify/${record.idemark_id}`)}
            >
              <ExternalLink className="h-3 w-3 mr-2" />
              Verify Certificate
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
