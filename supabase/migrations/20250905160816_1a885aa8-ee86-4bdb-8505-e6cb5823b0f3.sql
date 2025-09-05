-- Create trigger for new followers (notifications)
DROP TRIGGER IF EXISTS on_new_follow ON public.followers;
CREATE TRIGGER on_new_follow
  AFTER INSERT ON public.followers
  FOR EACH ROW EXECUTE FUNCTION public.notify_follow();