import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Users, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { CreateGroupDialog } from "@/components/groups/CreateGroupDialog";
import { FriendRequestsDialog } from "@/components/groups/FriendRequestsDialog";
import { useAuth } from "@/hooks/useAuth";

interface Group {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_at: string;
  memberCount: number;
  unreadCount: number;
}

export default function Groups() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFriendsDialog, setShowFriendsDialog] = useState(false);

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  const fetchGroups = async () => {
    try {
      // Fetch groups where user is a member
      const { data: memberGroups, error: memberError } = await supabase
        .from("group_members")
        .select(`
          group_id,
          groups (
            id,
            name,
            description,
            avatar_url,
            created_at,
            created_by
          )
        `)
        .eq("user_id", user?.id);

      if (memberError) throw memberError;

      // Fetch groups where user is the creator (but may not be a member yet)
      const { data: createdGroups, error: createdError } = await supabase
        .from("groups")
        .select("id, name, description, avatar_url, created_at, created_by")
        .eq("created_by", user?.id);

      if (createdError) throw createdError;

      // Combine and deduplicate groups
      const memberGroupsData = memberGroups?.map((gm: any) => gm.groups) || [];
      const allGroups = [...memberGroupsData];
      
      // Add created groups that aren't already in the list
      createdGroups?.forEach((createdGroup: any) => {
        if (!allGroups.find((g: any) => g.id === createdGroup.id)) {
          allGroups.push(createdGroup);
        }
      });

      const groupsWithCounts = await Promise.all(
        allGroups.map(async (group: any) => {
          // Get member count
          const { count: memberCount } = await supabase
            .from("group_members")
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id);

          return {
            ...group,
            memberCount: memberCount || 0,
            unreadCount: 0,
          };
        })
      );

      setGroups(groupsWithCounts);
    } catch (error: any) {
      toast.error("Failed to load groups");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGroupCreated = () => {
    setShowCreateDialog(false);
    fetchGroups();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Groups</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFriendsDialog(true)}
            >
              <Users className="h-5 w-5" />
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-5 w-5 mr-2" />
              Create Group
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading groups...</div>
        ) : groups.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
            <p className="text-muted-foreground mb-4">
              Create a group to start brainstorming with other creators
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Group
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {groups.map((group) => (
              <Card
                key={group.id}
                className="p-4 hover:bg-accent cursor-pointer transition-colors"
                onClick={() => navigate(`/groups/${group.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    {group.avatar_url ? (
                      <img
                        src={group.avatar_url}
                        alt={group.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <Users className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{group.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {group.memberCount} members
                    </p>
                    {group.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {group.description}
                      </p>
                    )}
                  </div>
                  {group.unreadCount > 0 && (
                    <div className="bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs font-semibold">
                      {group.unreadCount}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateGroupDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onGroupCreated={handleGroupCreated}
      />

      <FriendRequestsDialog
        open={showFriendsDialog}
        onOpenChange={setShowFriendsDialog}
      />
    </div>
  );
}
