-- Fix storage policies for profile picture uploads
-- Create proper storage policies for the media bucket

-- Create policy for avatar uploads in media bucket
CREATE POLICY "Users can upload their own avatars"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'media' 
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Create policy for viewing avatars
CREATE POLICY "Anyone can view avatars"
ON storage.objects
FOR SELECT
USING (bucket_id = 'media' AND (storage.foldername(name))[1] = 'avatars');

-- Create policy for users to update their own avatars
CREATE POLICY "Users can update their own avatars"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'media' 
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Create policy for users to delete their own avatars
CREATE POLICY "Users can delete their own avatars"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'media' 
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Create policies for general media uploads
CREATE POLICY "Users can upload their own media"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'media' 
  AND (storage.foldername(name))[1] != 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy for viewing all media
CREATE POLICY "Anyone can view media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'media');

-- Create policy for users to update their own media
CREATE POLICY "Users can update their own media"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'media' 
  AND (storage.foldername(name))[1] != 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy for users to delete their own media
CREATE POLICY "Users can delete their own media"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'media' 
  AND (storage.foldername(name))[1] != 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);