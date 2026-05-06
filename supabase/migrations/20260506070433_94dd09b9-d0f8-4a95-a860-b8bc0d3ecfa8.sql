-- 1. Profiles: restrict SELECT
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "Staff can view all profiles"
  ON public.profiles FOR SELECT
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'teacher'::app_role));

-- 2. user_roles: restrict SELECT
DROP POLICY IF EXISTS "Everyone can view user roles" ON public.user_roles;
CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Staff can view all user roles"
  ON public.user_roles FOR SELECT
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'teacher'::app_role));

-- 3. teacher_subjects: require auth
DROP POLICY IF EXISTS "Everyone can view teacher assignments" ON public.teacher_subjects;
CREATE POLICY "Authenticated users can view teacher assignments"
  ON public.teacher_subjects FOR SELECT
  TO authenticated
  USING (true);

-- 4. questions: remove direct student SELECT
DROP POLICY IF EXISTS "Students can view questions during assessment" ON public.questions;
CREATE POLICY "Staff can view all questions"
  ON public.questions FOR SELECT
  USING (has_role(auth.uid(),'teacher'::app_role) OR has_role(auth.uid(),'admin'::app_role));

-- Helper: practice questions for student's class
CREATE OR REPLACE FUNCTION public.get_practice_questions(_subject_id uuid)
RETURNS TABLE (
  id uuid,
  question_text text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  correct_answer text,
  assessment_id uuid,
  subject_id uuid,
  subject_name text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
         q.correct_answer, q.assessment_id, a.subject_id, s.name AS subject_name
  FROM public.questions q
  JOIN public.assessments a ON a.id = q.assessment_id
  LEFT JOIN public.subjects s ON s.id = a.subject_id
  WHERE a.class_id = public.get_user_class(auth.uid())
    AND (_subject_id IS NULL OR a.subject_id = _subject_id);
$$;

-- Helper: review questions for an attempt the caller owns (or staff)
CREATE OR REPLACE FUNCTION public.get_review_questions(_attempt_id uuid)
RETURNS TABLE (
  id uuid,
  question_text text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  correct_answer text,
  assessment_id uuid
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _assessment_id uuid;
  _student uuid;
BEGIN
  SELECT a.assessment_id, a.student_id INTO _assessment_id, _student
  FROM public.attempts a WHERE a.id = _attempt_id;

  IF _assessment_id IS NULL THEN
    RETURN;
  END IF;

  IF _student <> auth.uid()
     AND NOT has_role(auth.uid(),'teacher'::app_role)
     AND NOT has_role(auth.uid(),'admin'::app_role) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
         q.correct_answer, q.assessment_id
  FROM public.questions q
  WHERE q.assessment_id = _assessment_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_practice_questions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_practice_questions(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_review_questions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_review_questions(uuid) TO authenticated;