-- 1. teacher_classes
CREATE TABLE IF NOT EXISTS public.teacher_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  class_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, class_id)
);
ALTER TABLE public.teacher_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view teacher classes"
  ON public.teacher_classes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage teacher classes"
  ON public.teacher_classes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. helper function
CREATE OR REPLACE FUNCTION public.teacher_in_class(_teacher uuid, _class uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_classes
    WHERE teacher_id = _teacher AND class_id = _class
  );
$$;

-- 3. tighten teacher INSERT on assessments
DROP POLICY IF EXISTS "Teachers can create assessments for their subjects" ON public.assessments;
CREATE POLICY "Teachers create assessments for their subjects and classes"
  ON public.assessments FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'teacher'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.teacher_subjects ts
      WHERE ts.teacher_id = auth.uid() AND ts.subject_id = assessments.subject_id
    )
    AND (
      assessments.class_id IS NULL
      OR public.teacher_in_class(auth.uid(), assessments.class_id)
    )
  );

-- 4. class_materials
CREATE TABLE IF NOT EXISTS public.class_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL,
  uploaded_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  file_path text NOT NULL,
  file_type text,
  file_size bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.class_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View materials in own class"
  ON public.class_materials FOR SELECT
  USING (
    class_id = public.get_user_class(auth.uid())
    OR public.teacher_in_class(auth.uid(), class_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Teachers upload materials to assigned classes"
  ON public.class_materials FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      (public.has_role(auth.uid(), 'teacher'::app_role) AND public.teacher_in_class(auth.uid(), class_id))
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Uploader or admin deletes materials"
  ON public.class_materials FOR DELETE
  USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 5. storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('class-materials', 'class-materials', false)
ON CONFLICT (id) DO NOTHING;

-- 6. storage policies (paths layout: <class_id>/<filename>)
DROP POLICY IF EXISTS "Class members can read materials" ON storage.objects;
CREATE POLICY "Class members can read materials"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'class-materials' AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR (
        (storage.foldername(name))[1] IS NOT NULL
        AND (
          public.get_user_class(auth.uid())::text = (storage.foldername(name))[1]
          OR public.teacher_in_class(auth.uid(), ((storage.foldername(name))[1])::uuid)
        )
      )
    )
  );

DROP POLICY IF EXISTS "Teachers upload materials to class folder" ON storage.objects;
CREATE POLICY "Teachers upload materials to class folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'class-materials' AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR (
        public.has_role(auth.uid(), 'teacher'::app_role)
        AND (storage.foldername(name))[1] IS NOT NULL
        AND public.teacher_in_class(auth.uid(), ((storage.foldername(name))[1])::uuid)
      )
    )
  );

DROP POLICY IF EXISTS "Uploader or admin deletes material objects" ON storage.objects;
CREATE POLICY "Uploader or admin deletes material objects"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'class-materials' AND (
      owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );