import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, Search, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface UserProfile {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export function SendMemberRequestDialog({
  open,
  onOpenChange,
  groupId,
  groupName,
  onMemberAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  onMemberAdded?: () => void;
}) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [existingMembers, setExistingMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchExistingMembers();
    }
  }, [open, groupId]);

  const fetchExistingMembers = async () => {
    const { data } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId);
    
    setExistingMembers(data?.map(m => m.user_id) || []);
  };

  const searchUsers = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, username, avatar_url')
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      
      // Filter out current user and existing members
      const filtered = (data || []).filter(
        p => p.user_id !== user?.id && !existingMembers.includes(p.user_id)
      );
      
      setSearchResults(filtered);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendInvite = async (targetUser: UserProfile) => {
    setSendingTo(targetUser.user_id);
    try {
      // Add user directly to group as member
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: targetUser.user_id,
          role: 'member',
        });

      if (error) throw error;
      
      toast.success(`${targetUser.full_name || targetUser.username} added to ${groupName}!`);
      
      // Update local state
      setExistingMembers([...existingMembers, targetUser.user_id]);
      setSearchResults(searchResults.filter(u => u.user_id !== targetUser.user_id));
      
      onMemberAdded?.();
    } catch (error: any) {
      toast.error('Failed to add member');
      console.error(error);
    } finally {
      setSendingTo(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Members to {groupName}
          </DialogTitle>
          <DialogDescription>
            Search for users to add to your group
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or username..."
              value={searchQuery}
              onChange={(e) => searchUsers(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Search Results */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">
                Searching...
              </div>
            ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
              <div className="text-center py-4 text-muted-foreground">
                No users found
              </div>
            ) : (
              searchResults.map((profile) => (
                <div
                  key={profile.user_id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <Avatar>
                    <AvatarImage src={profile.avatar_url || ''} />
                    <AvatarFallback>
                      {(profile.full_name || profile.username || 'U')[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {profile.full_name || profile.username}
                    </p>
                    {profile.username && profile.full_name && (
                      <p className="text-sm text-muted-foreground truncate">
                        @{profile.username}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => sendInvite(profile)}
                    disabled={sendingTo === profile.user_id}
                  >
                    {sendingTo === profile.user_id ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-1" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>

          {searchQuery.length < 2 && (
            <p className="text-xs text-muted-foreground text-center">
              Type at least 2 characters to search
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
