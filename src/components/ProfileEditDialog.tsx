import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { sanitizeInput } from '@/utils/security';
import { validateFileUpload } from '@/utils/fileValidation';

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: {
    full_name?: string;
    bio?: string;
    website_url?: string;
    avatar_url?: string;
  };
  onProfileUpdate: () => void;
}

export const ProfileEditDialog = ({ open, onOpenChange, profile, onProfileUpdate }: ProfileEditDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    bio: profile.bio || '',
    website_url: profile.website_url || '',
    avatar_url: profile.avatar_url || ''
  });

  const handleInputChange = (field: string, value: string) => {
    const sanitizedValue = sanitizeInput(value);
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    const validation = validateFileUpload(file, ['image/jpeg', 'image/png', 'image/webp'], 5 * 1024 * 1024);
    if (!validation.isValid) {
      toast({
        title: "Upload Error",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Create safe filename
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage - using correct path structure for policies
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(`avatars/${user.id}/${fileName}`, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(`avatars/${user.id}/${fileName}`);

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      
      toast({
        title: "Success",
        description: "Avatar uploaded successfully",
      });
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name.trim() || null,
          bio: formData.bio.trim() || null,
          website_url: formData.website_url.trim() || null,
          avatar_url: formData.avatar_url || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      onProfileUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={formData.avatar_url} />
                <AvatarFallback>{formData.full_name?.charAt(0) || user?.email?.charAt(0)}</AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 rounded-full cursor-pointer hover:bg-primary/90">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              {uploading && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="Enter your full name"
                maxLength={100}
              />
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell us about yourself"
                maxLength={500}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="website_url">Website</Label>
              <Input
                id="website_url"
                type="url"
                value={formData.website_url}
                onChange={(e) => handleInputChange('website_url', e.target.value)}
                placeholder="https://your-website.com"
                maxLength={200}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};