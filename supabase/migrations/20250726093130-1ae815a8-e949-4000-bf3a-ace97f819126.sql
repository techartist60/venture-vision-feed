-- Create additional storage policies specifically for avatar uploads
-- Since general media policies exist, we need to ensure avatar folder access

-- Drop and recreate the general media upload policy to handle avatars correctly  
DROP POLICY IF EXISTS "Users can upload their own media" ON storage.objects;

-- Create new policy that allows both regular media and avatar uploads
CREATE POLICY "Users can upload their own media"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'media' 
  AND (
    -- For avatars: must be in avatars folder with user ID as second folder
    ((storage.foldername(name))[1] = 'avatars' AND auth.uid()::text = (storage.foldername(name))[2])
    OR
    -- For regular media: user ID as first folder, not in avatars
    (auth.uid()::text = (storage.foldername(name))[1] AND (storage.foldername(name))[1] != 'avatars')
  )
);

-- Update the general update policy to handle avatars correctly
DROP POLICY IF EXISTS "Users can update their own media" ON storage.objects;

CREATE POLICY "Users can update their own media"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'media' 
  AND (
    -- For avatars: must be in avatars folder with user ID as second folder
    ((storage.foldername(name))[1] = 'avatars' AND auth.uid()::text = (storage.foldername(name))[2])
    OR
    -- For regular media: user ID as first folder, not in avatars
    (auth.uid()::text = (storage.foldername(name))[1] AND (storage.foldername(name))[1] != 'avatars')
  )
);

-- Update the general delete policy to handle avatars correctly  
DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;

CREATE POLICY "Users can delete their own media"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'media' 
  AND (
    -- For avatars: must be in avatars folder with user ID as second folder
    ((storage.foldername(name))[1] = 'avatars' AND auth.uid()::text = (storage.foldername(name))[2])
    OR
    -- For regular media: user ID as first folder, not in avatars  
    (auth.uid()::text = (storage.foldername(name))[1] AND (storage.foldername(name))[1] != 'avatars')
  )
);