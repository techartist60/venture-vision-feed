import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserPlus, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Member {
  id: string;
  user_id: string;
  role: string;
  profiles: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

interface Friend {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export function GroupMembersDialog({
  open,
  onOpenChange,
  groupId,
  isAdmin,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  isAdmin: boolean;
}) {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [showAddFriend, setShowAddFriend] = useState(false);

  useEffect(() => {
    if (open) {
      fetchMembers();
      if (isAdmin) {
        fetchFriendsNotInGroup();
      }
    }
  }, [open, groupId, isAdmin]);

  const fetchMembers = async () => {
    try {
      const { data: membersData, error } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", groupId);

      if (error) throw error;

      if (membersData && membersData.length > 0) {
        const userIds = membersData.map((m) => m.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, username, avatar_url")
          .in("user_id", userIds);

        const membersWithProfiles = membersData.map((member) => ({
          ...member,
          profiles: profiles?.find((p) => p.user_id === member.user_id) || {
            full_name: null,
            username: null,
            avatar_url: null,
          },
        }));

        setMembers(membersWithProfiles as any);
      }
    } catch (error: any) {
      console.error(error);
    }
  };

  const fetchFriendsNotInGroup = async () => {
    try {
      const { data: friendships } = await supabase
        .from("friendships")
        .select("user_id_1, user_id_2")
        .or(`user_id_1.eq.${user?.id},user_id_2.eq.${user?.id}`);

      const friendIds = friendships?.map((f) =>
        f.user_id_1 === user?.id ? f.user_id_2 : f.user_id_1
      );

      if (friendIds && friendIds.length > 0) {
        const memberIds = members.map((m) => m.user_id);
        const availableFriendIds = friendIds.filter(
          (id) => !memberIds.includes(id)
        );

        if (availableFriendIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, username, avatar_url")
            .in("user_id", availableFriendIds);

          setFriends(profiles || []);
        } else {
          setFriends([]);
        }
      }
    } catch (error: any) {
      console.error(error);
    }
  };

  const addMember = async (userId: string) => {
    try {
      const { error } = await supabase.from("group_members").insert({
        group_id: groupId,
        user_id: userId,
        role: "member",
      });

      if (error) throw error;
      toast.success("Member added successfully!");
      fetchMembers();
      fetchFriendsNotInGroup();
      setShowAddFriend(false);
    } catch (error: any) {
      toast.error("Failed to add member");
    }
  };

  const removeMember = async (memberId: string, memberUserId: string) => {
    if (memberUserId === user?.id) {
      toast.error("You cannot remove yourself");
      return;
    }

    try {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
      toast.success("Member removed successfully!");
      fetchMembers();
      fetchFriendsNotInGroup();
    } catch (error: any) {
      toast.error("Failed to remove member");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Group Members</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isAdmin && !showAddFriend && friends.length > 0 && (
            <Button
              onClick={() => setShowAddFriend(true)}
              className="w-full"
              variant="outline"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Friend to Group
            </Button>
          )}

          {showAddFriend && (
            <div className="space-y-2">
              <Select onValueChange={(value) => addMember(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a friend to add" />
                </SelectTrigger>
                <SelectContent>
                  {friends.map((friend) => (
                    <SelectItem key={friend.user_id} value={friend.user_id}>
                      {friend.full_name || friend.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                onClick={() => setShowAddFriend(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          )}

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={member.profiles?.avatar_url || ""} />
                  <AvatarFallback>
                    {(member.profiles?.full_name ||
                      member.profiles?.username ||
                      "U")[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">
                    {member.profiles?.full_name || member.profiles?.username}
                    {member.user_id === user?.id && " (You)"}
                  </p>
                  <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                    {member.role}
                  </Badge>
                </div>
                {isAdmin && member.user_id !== user?.id && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeMember(member.id, member.user_id)}
                  >
                    <UserMinus className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
