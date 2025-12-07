-- Add marks_per_question column to assessments table
ALTER TABLE public.assessments ADD COLUMN marks_per_question integer DEFAULT 1;

-- Add marks_per_question column to mock_exams table
ALTER TABLE public.mock_exams ADD COLUMN marks_per_question integer DEFAULT 1;