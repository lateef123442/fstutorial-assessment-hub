-- Create mock_exams table
CREATE TABLE public.mock_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  duration_per_subject_minutes INTEGER NOT NULL DEFAULT 45,
  total_duration_minutes INTEGER NOT NULL DEFAULT 180,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create mock_exam_subjects table (links subjects to mock exams, max 4)
CREATE TABLE public.mock_exam_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_exam_id UUID REFERENCES public.mock_exams(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  order_position INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(mock_exam_id, subject_id),
  CONSTRAINT order_position_check CHECK (order_position >= 1 AND order_position <= 4)
);

-- Create function to enforce max 4 subjects per mock exam
CREATE OR REPLACE FUNCTION public.check_mock_exam_subject_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.mock_exam_subjects WHERE mock_exam_id = NEW.mock_exam_id) >= 4 THEN
    RAISE EXCEPTION 'Maximum of 4 subjects allowed per mock exam';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for subject limit
CREATE TRIGGER enforce_mock_exam_subject_limit
BEFORE INSERT ON public.mock_exam_subjects
FOR EACH ROW EXECUTE FUNCTION public.check_mock_exam_subject_limit();

-- Create mock_exam_attempts table
CREATE TABLE public.mock_exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_exam_id UUID REFERENCES public.mock_exams(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.profiles(id) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  current_subject_index INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(mock_exam_id, student_id)
);

-- Create mock_exam_subject_results table
CREATE TABLE public.mock_exam_subject_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES public.mock_exam_attempts(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) NOT NULL,
  assessment_id UUID REFERENCES public.assessments(id),
  score INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(attempt_id, subject_id)
);

-- Enable RLS
ALTER TABLE public.mock_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_subject_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mock_exams
CREATE POLICY "Everyone can view active mock exams" ON public.mock_exams
FOR SELECT USING (true);

CREATE POLICY "Admins can manage mock exams" ON public.mock_exams
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for mock_exam_subjects
CREATE POLICY "Everyone can view mock exam subjects" ON public.mock_exam_subjects
FOR SELECT USING (true);

CREATE POLICY "Admins can manage mock exam subjects" ON public.mock_exam_subjects
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for mock_exam_attempts
CREATE POLICY "Students can view their own attempts" ON public.mock_exam_attempts
FOR SELECT USING (student_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'));

CREATE POLICY "Students can create their own attempts" ON public.mock_exam_attempts
FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their own attempts" ON public.mock_exam_attempts
FOR UPDATE USING (student_id = auth.uid());

-- RLS Policies for mock_exam_subject_results
CREATE POLICY "Students can view their own results" ON public.mock_exam_subject_results
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.mock_exam_attempts 
    WHERE id = mock_exam_subject_results.attempt_id 
    AND (student_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'))
  )
);

CREATE POLICY "Students can manage their own results" ON public.mock_exam_subject_results
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.mock_exam_attempts 
    WHERE id = mock_exam_subject_results.attempt_id 
    AND student_id = auth.uid()
  )
);