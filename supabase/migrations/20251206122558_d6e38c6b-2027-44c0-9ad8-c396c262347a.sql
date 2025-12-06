-- Add column to flag assessments that belong to mock exams
ALTER TABLE public.assessments ADD COLUMN is_mock_exam boolean DEFAULT false;

-- Update existing mock exam assessments (those with titles containing " - " after a mock exam name pattern)
UPDATE public.assessments 
SET is_mock_exam = true 
WHERE title LIKE 'Mock - %' 
   OR title LIKE '% - English%'
   OR title LIKE '% - Mathematics%'
   OR title LIKE '% - Physics%'
   OR title LIKE '% - chemistry%'
   OR id IN (
     SELECT a.id FROM assessments a
     INNER JOIN mock_exam_subjects mes ON mes.subject_id = a.subject_id
     INNER JOIN mock_exams me ON me.id = mes.mock_exam_id
     WHERE a.title LIKE me.title || ' - %'
   );