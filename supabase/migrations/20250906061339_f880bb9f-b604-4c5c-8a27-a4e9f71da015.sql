-- Ensure follower relationships are unique and performant, and add follow notifications

-- 1) Unique constraint to prevent duplicate follows
CREATE UNIQUE INDEX IF NOT EXISTS uniq_followers_pair
ON public.followers (follower_id, following_id);

-- 2) Helpful indexes for common queries
CREATE INDEX IF NOT EXISTS idx_followers_following_id ON public.followers (following_id);
CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON public.followers (follower_id);

-- 3) Create trigger to send follow notifications (function already exists)
DROP TRIGGER IF EXISTS trg_notify_follow ON public.followers;
CREATE TRIGGER trg_notify_follow
AFTER INSERT ON public.followers
FOR EACH ROW
EXECUTE FUNCTION public.notify_follow();