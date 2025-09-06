-- Enable realtime for followers table for real-time follow updates
ALTER TABLE public.followers REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.followers;