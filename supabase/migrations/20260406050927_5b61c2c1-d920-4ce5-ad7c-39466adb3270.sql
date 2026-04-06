-- Create live_sessions table
CREATE TABLE public.live_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT 'Untitled Presentation',
  presenter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  presenter_name TEXT NOT NULL DEFAULT 'Anonymous',
  presentation_url TEXT,
  current_slide INTEGER NOT NULL DEFAULT 0,
  total_slides INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create session_messages table
CREATE TABLE public.session_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id UUID,
  sender_name TEXT NOT NULL DEFAULT 'Guest',
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_messages ENABLE ROW LEVEL SECURITY;

-- Live sessions policies
CREATE POLICY "Anyone can view active sessions"
  ON public.live_sessions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create sessions"
  ON public.live_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = presenter_id);

CREATE POLICY "Presenters can update their sessions"
  ON public.live_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = presenter_id);

CREATE POLICY "Presenters can delete their sessions"
  ON public.live_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = presenter_id);

-- Session messages policies (open for guests too)
CREATE POLICY "Anyone can view session messages"
  ON public.session_messages FOR SELECT
  USING (true);

CREATE POLICY "Anyone can send messages"
  ON public.session_messages FOR INSERT
  WITH CHECK (true);

-- Timestamp trigger
CREATE TRIGGER update_live_sessions_updated_at
  BEFORE UPDATE ON public.live_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for presentations
INSERT INTO storage.buckets (id, name, public) VALUES ('presentations', 'presentations', true);

CREATE POLICY "Anyone can view presentations"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'presentations');

CREATE POLICY "Authenticated users can upload presentations"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'presentations');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_messages;