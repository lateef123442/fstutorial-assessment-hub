-- Add class_id to question_bank for class-scoped questions
ALTER TABLE public.question_bank
ADD COLUMN IF NOT EXISTS class_id uuid;

-- Update SELECT policy: students see only questions for their class
DROP POLICY IF EXISTS "Students can view question bank" ON public.question_bank;
CREATE POLICY "Students view class question bank"
ON public.question_bank
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
  OR (
    has_role(auth.uid(), 'student'::app_role)
    AND (class_id IS NULL OR class_id = public.get_user_class(auth.uid()))
  )
);

-- Update INSERT: teachers must own subject AND be assigned to the class
DROP POLICY IF EXISTS "Teachers can insert questions for their subjects" ON public.question_bank;
CREATE POLICY "Teachers insert questions for their subject and class"
ON public.question_bank
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'teacher'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.teacher_subjects
      WHERE teacher_id = auth.uid() AND subject_id = question_bank.subject_id
    )
    AND (class_id IS NULL OR public.teacher_in_class(auth.uid(), class_id))
  )
);

-- Update get_practice_questions to also include question_bank scoped to student's class
CREATE OR REPLACE FUNCTION public.get_practice_questions(_subject_id uuid)
 RETURNS TABLE(id uuid, question_text text, option_a text, option_b text, option_c text, option_d text, correct_answer text, assessment_id uuid, subject_id uuid, subject_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
         q.correct_answer, q.assessment_id, a.subject_id, s.name AS subject_name
  FROM public.questions q
  JOIN public.assessments a ON a.id = q.assessment_id
  LEFT JOIN public.subjects s ON s.id = a.subject_id
  WHERE a.class_id = public.get_user_class(auth.uid())
    AND (_subject_id IS NULL OR a.subject_id = _subject_id);
$function$;