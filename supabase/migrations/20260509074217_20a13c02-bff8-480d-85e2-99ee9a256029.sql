
-- 1. Fix privilege escalation in user_roles INSERT policy
DROP POLICY IF EXISTS "Allow first user or admins to insert roles" ON public.user_roles;
CREATE POLICY "Allow first user or admins to insert roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR NOT EXISTS (SELECT 1 FROM public.user_roles)
  );

-- 2. Restrict assessments SELECT to authenticated users
DROP POLICY IF EXISTS "Everyone can view active assessments" ON public.assessments;
CREATE POLICY "Authenticated users can view assessments"
  ON public.assessments
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Restrict mock_exams SELECT to authenticated users
DROP POLICY IF EXISTS "Everyone can view active mock exams" ON public.mock_exams;
CREATE POLICY "Authenticated users can view mock exams"
  ON public.mock_exams
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. Restrict mock_exam_subjects SELECT to authenticated users
DROP POLICY IF EXISTS "Everyone can view mock exam subjects" ON public.mock_exam_subjects;
CREATE POLICY "Authenticated users can view mock exam subjects"
  ON public.mock_exam_subjects
  FOR SELECT
  TO authenticated
  USING (true);

-- 5. Scope teacher SELECT on questions to their own assessments only
DROP POLICY IF EXISTS "Staff can view all questions" ON public.questions;
CREATE POLICY "Teachers and admins view scoped questions"
  ON public.questions
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = questions.assessment_id AND a.teacher_id = auth.uid()
    )
  );

-- 6. Hide correct_answer in question_bank from students:
--    restrict base table SELECT to staff and provide secure RPCs for students.
DROP POLICY IF EXISTS "Students view class question bank" ON public.question_bank;
CREATE POLICY "Staff view question bank"
  ON public.question_bank
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'teacher'::app_role)
  );

-- RPC: students fetch practice questions from question bank without correct_answer
CREATE OR REPLACE FUNCTION public.get_question_bank_practice(_subject_id uuid)
RETURNS TABLE (
  id uuid,
  question_text text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  subject_id uuid,
  subject_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT qb.id, qb.question_text, qb.option_a, qb.option_b, qb.option_c, qb.option_d,
         qb.subject_id, s.name AS subject_name
  FROM public.question_bank qb
  LEFT JOIN public.subjects s ON s.id = qb.subject_id
  WHERE (qb.class_id IS NULL OR qb.class_id = public.get_user_class(auth.uid()))
    AND (_subject_id IS NULL OR qb.subject_id = _subject_id);
$$;

-- RPC: reveal correct answers only after the student submits
CREATE OR REPLACE FUNCTION public.grade_question_bank(_question_ids uuid[])
RETURNS TABLE (id uuid, correct_answer text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT qb.id, qb.correct_answer
  FROM public.question_bank qb
  WHERE qb.id = ANY(_question_ids)
    AND (qb.class_id IS NULL OR qb.class_id = public.get_user_class(auth.uid()));
$$;
