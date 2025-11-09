-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Subjects table
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Teacher assignments table
CREATE TABLE public.teacher_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(teacher_id, subject_id)
);

ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;

-- Assessments table
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  passing_score INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- Questions table
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Student attempts table
CREATE TABLE public.attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  score INTEGER,
  total_questions INTEGER,
  passed BOOLEAN
);

ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;

-- Student answers table
CREATE TABLE public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES public.attempts(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  selected_answer TEXT CHECK (selected_answer IN ('A', 'B', 'C', 'D')),
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- User roles policies
CREATE POLICY "Everyone can view user roles"
  ON public.user_roles FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage user roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Subjects policies
CREATE POLICY "Everyone can view subjects"
  ON public.subjects FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage subjects"
  ON public.subjects FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Teacher subjects policies
CREATE POLICY "Everyone can view teacher assignments"
  ON public.teacher_subjects FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage teacher assignments"
  ON public.teacher_subjects FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Assessments policies
CREATE POLICY "Everyone can view active assessments"
  ON public.assessments FOR SELECT
  USING (true);

CREATE POLICY "Teachers can create assessments for their subjects"
  ON public.assessments FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'teacher') AND
    EXISTS (
      SELECT 1 FROM public.teacher_subjects
      WHERE teacher_id = auth.uid() AND subject_id = assessments.subject_id
    )
  );

CREATE POLICY "Teachers can update their own assessments"
  ON public.assessments FOR UPDATE
  USING (teacher_id = auth.uid());

CREATE POLICY "Admins can manage all assessments"
  ON public.assessments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Questions policies
CREATE POLICY "Students can view questions during assessment"
  ON public.questions FOR SELECT
  USING (
    public.has_role(auth.uid(), 'student') OR
    public.has_role(auth.uid(), 'teacher') OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Teachers can manage questions for their assessments"
  ON public.questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments
      WHERE id = questions.assessment_id AND teacher_id = auth.uid()
    ) OR public.has_role(auth.uid(), 'admin')
  );

-- Attempts policies
CREATE POLICY "Students can view their own attempts"
  ON public.attempts FOR SELECT
  USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students can create their own attempts"
  ON public.attempts FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their own attempts"
  ON public.attempts FOR UPDATE
  USING (student_id = auth.uid());

-- Answers policies
CREATE POLICY "Students can manage their own answers"
  ON public.answers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.attempts
      WHERE id = answers.attempt_id AND student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers and admins can view all answers"
  ON public.answers FOR SELECT
  USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    new.email
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();