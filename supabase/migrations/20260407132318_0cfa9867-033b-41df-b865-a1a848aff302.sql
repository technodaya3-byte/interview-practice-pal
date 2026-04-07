
-- Table to track participants in a live session
CREATE TABLE public.live_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'Guest',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, participant_id)
);

ALTER TABLE public.live_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view participants" ON public.live_participants FOR SELECT USING (true);
CREATE POLICY "Anyone can insert participants" ON public.live_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update participants" ON public.live_participants FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete participants" ON public.live_participants FOR DELETE USING (true);

CREATE TRIGGER update_live_participants_updated_at
  BEFORE UPDATE ON public.live_participants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table for WebRTC signaling (offers, answers, ICE candidates)
CREATE TABLE public.webrtc_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  signal_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.webrtc_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view signals" ON public.webrtc_signals FOR SELECT USING (true);
CREATE POLICY "Anyone can insert signals" ON public.webrtc_signals FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete signals" ON public.webrtc_signals FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.webrtc_signals;
