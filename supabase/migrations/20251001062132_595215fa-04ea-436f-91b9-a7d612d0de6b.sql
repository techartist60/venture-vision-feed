-- Create trigger to notify on new followers
CREATE TRIGGER notify_follower_trigger
  AFTER INSERT ON public.followers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_follow();