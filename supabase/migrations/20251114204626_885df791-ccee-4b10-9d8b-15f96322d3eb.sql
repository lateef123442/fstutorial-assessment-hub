-- Add scheduling fields to assessments table
ALTER TABLE public.assessments
ADD COLUMN scheduled_date DATE,
ADD COLUMN scheduled_time TIME;

-- Add violation tracking to attempts table
ALTER TABLE public.attempts
ADD COLUMN violations INTEGER DEFAULT 0,
ADD COLUMN auto_submitted BOOLEAN DEFAULT false;