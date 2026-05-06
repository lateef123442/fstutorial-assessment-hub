DROP POLICY IF EXISTS "Anyone authenticated can view classes" ON public.classes;
CREATE POLICY "Anyone can view classes" ON public.classes FOR SELECT TO anon, authenticated USING (true);