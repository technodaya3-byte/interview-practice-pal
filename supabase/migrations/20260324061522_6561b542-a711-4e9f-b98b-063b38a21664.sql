
CREATE TABLE public.question_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  category text NOT NULL DEFAULT 'behavioral',
  job_title text NOT NULL DEFAULT '',
  job_level text NOT NULL DEFAULT 'mid',
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage question bank"
ON public.question_bank
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- All authenticated users can read questions
CREATE POLICY "Users can read questions"
ON public.question_bank
FOR SELECT
TO authenticated
USING (true);
