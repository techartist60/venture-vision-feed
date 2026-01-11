-- Add verified status to profiles
ALTER TABLE public.profiles 
ADD COLUMN is_verified BOOLEAN DEFAULT false;

-- Set @idestrim as verified (find by username)
UPDATE public.profiles 
SET is_verified = true 
WHERE username = 'idestrim';