-- Check if avatars bucket exists, if not create it
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for avatar uploads in the avatars bucket
-- Allow users to upload their own avatars
CREATE POLICY "Users can upload their own avatars" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own avatars
CREATE POLICY "Users can view their own avatars" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own avatars
CREATE POLICY "Users can update their own avatars" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatars" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Make avatars publicly viewable (so others can see profile pictures)
CREATE POLICY "Avatars are publicly viewable" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

-- Also create policies for the media bucket avatars folder
-- Allow users to upload avatars to media bucket
CREATE POLICY "Users can upload avatars to media bucket" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'media' AND 
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow users to view avatars in media bucket
CREATE POLICY "Users can view avatars in media bucket" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'media' AND 
  (storage.foldername(name))[1] = 'avatars'
);

-- Allow users to update their own avatars in media bucket
CREATE POLICY "Users can update their own avatars in media bucket" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'media' AND 
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow users to delete their own avatars in media bucket  
CREATE POLICY "Users can delete their own avatars in media bucket" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'media' AND 
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[2]
);