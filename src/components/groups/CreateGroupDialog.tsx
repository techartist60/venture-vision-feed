import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupCreated: () => void;
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  onGroupCreated,
}: CreateGroupDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a group name");
      return;
    }

    if (!user?.id) {
      toast.error("You must be logged in to create a group");
      return;
    }

    setLoading(true);
    try {
      // Get authenticated user to ensure we use the correct ID
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        toast.error("Authentication error. Please log in again.");
        return;
      }

      // Create the group - creator is automatically the owner
      const { error: groupError } = await supabase
        .from("groups")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          created_by: authUser.id,
        });

      if (groupError) throw groupError;

      toast.success("Group created! You can now add members from group settings.");
      setName("");
      setDescription("");
      onGroupCreated();
    } catch (error: any) {
      toast.error("Failed to create group");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter group name"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group about?"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
