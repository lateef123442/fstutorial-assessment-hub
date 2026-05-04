
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view classes" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert classes" ON public.classes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update classes" ON public.classes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete classes" ON public.classes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.profiles ADD COLUMN class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;
CREATE INDEX idx_profiles_class_id ON public.profiles(class_id);

ALTER TABLE public.assessments ADD COLUMN class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE;
CREATE INDEX idx_assessments_class_id ON public.assessments(class_id);

ALTER TABLE public.mock_exams ADD COLUMN class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE;
CREATE INDEX idx_mock_exams_class_id ON public.mock_exams(class_id);

CREATE OR REPLACE FUNCTION public.get_user_class(_user_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT class_id FROM public.profiles WHERE id = _user_id;
$$;
