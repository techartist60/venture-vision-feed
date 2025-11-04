import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X, UserPlus, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
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

export function FriendRequestsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchRequests();
      fetchFriends();
    }
  }, [open, user]);

  const fetchRequests = async () => {
    try {
      const { data: requestsData, error } = await supabase
        .from("friend_requests")
        .select("*")
        .eq("receiver_id", user?.id)
        .eq("status", "pending");

      if (error) throw error;

      if (requestsData && requestsData.length > 0) {
        const senderIds = requestsData.map((r) => r.sender_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, username, avatar_url")
          .in("user_id", senderIds);

        const requestsWithProfiles = requestsData.map((req) => ({
          ...req,
          profiles: profiles?.find((p) => p.user_id === req.sender_id) || {
            full_name: null,
            username: null,
            avatar_url: null,
          },
        }));

        setRequests(requestsWithProfiles as any);
      }
    } catch (error: any) {
      console.error(error);
    }
  };

  const fetchFriends = async () => {
    try {
      const { data, error } = await supabase
        .from("friendships")
        .select(`
          user_id_1,
          user_id_2
        `)
        .or(`user_id_1.eq.${user?.id},user_id_2.eq.${user?.id}`);

      if (error) throw error;

      const friendIds = data?.map((f) =>
        f.user_id_1 === user?.id ? f.user_id_2 : f.user_id_1
      );

      if (friendIds && friendIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, username, avatar_url")
          .in("user_id", friendIds);

        setFriends(profiles || []);
      }
    } catch (error: any) {
      console.error(error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, username, avatar_url")
        .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
        .neq("user_id", user?.id)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      toast.error("Failed to search users");
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (receiverId: string) => {
    try {
      const { error } = await supabase.from("friend_requests").insert({
        sender_id: user?.id,
        receiver_id: receiverId,
      });

      if (error) throw error;
      toast.success("Friend request sent!");
      setSearchResults([]);
      setSearchQuery("");
    } catch (error: any) {
      if (error.code === "23505") {
        toast.error("Friend request already sent");
      } else {
        toast.error("Failed to send friend request");
      }
    }
  };

  const handleRequest = async (requestId: string, accept: boolean) => {
    try {
      const { data: request, error: updateError } = await supabase
        .from("friend_requests")
        .update({ status: accept ? "accepted" : "rejected" })
        .eq("id", requestId)
        .select()
        .single();

      if (updateError) throw updateError;

      if (accept) {
        const [id1, id2] = [request.sender_id, request.receiver_id].sort();
        const { error: friendError } = await supabase
          .from("friendships")
          .insert({
            user_id_1: id1,
            user_id_2: id2,
          });

        if (friendError) throw friendError;
      }

      toast.success(accept ? "Friend request accepted" : "Friend request rejected");
      fetchRequests();
      fetchFriends();
    } catch (error: any) {
      toast.error("Failed to process request");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Friends & Requests</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="friends">Friends</TabsTrigger>
            <TabsTrigger value="requests">
              Requests {requests.length > 0 && `(${requests.length})`}
            </TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="space-y-4">
            {friends.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No friends yet
              </p>
            ) : (
              friends.map((friend) => (
                <div key={friend.user_id} className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={friend.avatar_url || ""} />
                    <AvatarFallback>
                      {(friend.full_name || friend.username || "U")[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">
                      {friend.full_name || friend.username}
                    </p>
                    {friend.username && (
                      <p className="text-sm text-muted-foreground">
                        @{friend.username}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            {requests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No pending requests
              </p>
            ) : (
              requests.map((request) => (
                <div key={request.id} className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={request.profiles?.avatar_url || ""} />
                    <AvatarFallback>
                      {(request.profiles?.full_name || request.profiles?.username || "U")[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">
                      {request.profiles?.full_name || request.profiles?.username}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRequest(request.id, true)}
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRequest(request.id, false)}
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="search" className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username..."
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={loading}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {searchResults.map((result) => (
              <div key={result.user_id} className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={result.avatar_url || ""} />
                  <AvatarFallback>
                    {(result.full_name || result.username || "U")[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">
                    {result.full_name || result.username}
                  </p>
                  {result.username && (
                    <p className="text-sm text-muted-foreground">
                      @{result.username}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => sendFriendRequest(result.user_id)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
