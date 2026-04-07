
CREATE TABLE public.question_bank (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  added_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view question bank questions
CREATE POLICY "Students can view question bank"
  ON public.question_bank FOR SELECT
  TO public
  USING (has_role(auth.uid(), 'student') OR has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'admin'));

-- Teachers can add questions for their assigned subjects
CREATE POLICY "Teachers can insert questions for their subjects"
  ON public.question_bank FOR INSERT
  TO public
  WITH CHECK (
    (has_role(auth.uid(), 'teacher') AND EXISTS (
      SELECT 1 FROM teacher_subjects WHERE teacher_id = auth.uid() AND subject_id = question_bank.subject_id
    ))
    OR has_role(auth.uid(), 'admin')
  );

-- Teachers can update their own questions, admins can update any
CREATE POLICY "Teachers can update own questions"
  ON public.question_bank FOR UPDATE
  TO public
  USING (
    (added_by = auth.uid() AND has_role(auth.uid(), 'teacher'))
    OR has_role(auth.uid(), 'admin')
  );

-- Teachers can delete their own questions, admins can delete any
CREATE POLICY "Teachers can delete own questions"
  ON public.question_bank FOR DELETE
  TO public
  USING (
    (added_by = auth.uid() AND has_role(auth.uid(), 'teacher'))
    OR has_role(auth.uid(), 'admin')
  );
