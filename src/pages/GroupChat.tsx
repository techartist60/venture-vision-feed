import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Settings, Users, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { GroupSettingsDialog } from "@/components/groups/GroupSettingsDialog";
import { GroupMembersDialog } from "@/components/groups/GroupMembersDialog";
import { SendMemberRequestDialog } from "@/components/groups/SendMemberRequestDialog";

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  profiles: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

interface Group {
  id: string;
  name: string;
  description: string | null;
}

export default function GroupChat() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && groupId) {
      fetchGroupData();
      fetchMessages();
      subscribeToMessages();
    }
  }, [user, groupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchGroupData = async () => {
    try {
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();

      if (groupError) throw groupError;
      setGroup(groupData);
      
      // Check if user is creator
      setIsCreator(groupData.created_by === user?.id);

      // Check if user is admin (member)
      const { data: memberData } = await supabase
        .from("group_members")
        .select("role")
        .eq("group_id", groupId)
        .eq("user_id", user?.id)
        .single();

      setIsAdmin(memberData?.role === "admin" || groupData.created_by === user?.id);
    } catch (error: any) {
      toast.error("Failed to load group");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data: messagesData, error } = await supabase
        .from("group_messages")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (messagesData && messagesData.length > 0) {
        const senderIds = [...new Set(messagesData.map((m) => m.sender_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, username, avatar_url")
          .in("user_id", senderIds);

        const messagesWithProfiles = messagesData.map((msg) => ({
          ...msg,
          profiles: profiles?.find((p) => p.user_id === msg.sender_id) || {
            full_name: null,
            username: null,
            avatar_url: null,
          },
        }));

        setMessages(messagesWithProfiles as any);
      } else {
        setMessages([]);
      }
    } catch (error: any) {
      toast.error("Failed to load messages");
      console.error(error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, username, avatar_url")
            .eq("user_id", payload.new.sender_id)
            .single();

          setMessages((prev) => [
            ...prev,
            { ...payload.new, profiles: profile } as Message,
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const { error } = await supabase.from("group_messages").insert({
        group_id: groupId,
        sender_id: user?.id,
        content: newMessage.trim(),
      });

      if (error) throw error;
      setNewMessage("");
    } catch (error: any) {
      toast.error("Failed to send message");
      console.error(error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/groups")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="font-semibold">{group?.name}</h2>
            {group?.description && (
              <p className="text-sm text-muted-foreground">{group.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {(isAdmin || isCreator) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAddMembers(true)}
              title="Add Members"
            >
              <UserPlus className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowMembers(true)}
          >
            <Users className="h-5 w-5" />
          </Button>
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isOwnMessage = message.sender_id === user?.id;
          return (
            <div
              key={message.id}
              className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : ""}`}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={message.profiles?.avatar_url || ""} />
                <AvatarFallback>
                  {(message.profiles?.full_name || message.profiles?.username || "U")[0]}
                </AvatarFallback>
              </Avatar>
              <div className={`flex flex-col ${isOwnMessage ? "items-end" : ""}`}>
                <span className="text-sm font-medium mb-1">
                  {isOwnMessage ? "You" : message.profiles?.full_name || message.profiles?.username}
                </span>
                <div
                  className={`rounded-lg px-4 py-2 max-w-md ${
                    isOwnMessage
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.content}
                </div>
                <span className="text-xs text-muted-foreground mt-1">
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" size="icon">
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </form>

      {isAdmin && group && (
        <GroupSettingsDialog
          open={showSettings}
          onOpenChange={setShowSettings}
          group={group}
          onGroupUpdated={fetchGroupData}
        />
      )}

      {group && (
        <GroupMembersDialog
          open={showMembers}
          onOpenChange={setShowMembers}
          groupId={group.id}
          isAdmin={isAdmin || isCreator}
        />
      )}

      {group && (
        <SendMemberRequestDialog
          open={showAddMembers}
          onOpenChange={setShowAddMembers}
          groupId={group.id}
          groupName={group.name}
          onMemberAdded={fetchGroupData}
        />
      )}
    </div>
  );
}
