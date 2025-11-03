-- Add privacy settings to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS following_private boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN profiles.following_private IS 'Controls whether the following list is private (only visible to profile owner)';