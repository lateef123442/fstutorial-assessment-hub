-- Fix function search path
CREATE OR REPLACE FUNCTION public.check_mock_exam_subject_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.mock_exam_subjects WHERE mock_exam_id = NEW.mock_exam_id) >= 4 THEN
    RAISE EXCEPTION 'Maximum of 4 subjects allowed per mock exam';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;