-- Add DELETE policy for teachers on their own assessments
CREATE POLICY "Teachers can delete their own assessments"
ON public.assessments
FOR DELETE
USING (teacher_id = auth.uid());