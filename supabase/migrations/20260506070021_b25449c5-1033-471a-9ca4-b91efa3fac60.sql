CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _class_id uuid;
BEGIN
  BEGIN
    _class_id := NULLIF(new.raw_user_meta_data->>'class_id','')::uuid;
  EXCEPTION WHEN others THEN
    _class_id := NULL;
  END;

  INSERT INTO public.profiles (id, full_name, email, class_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    new.email,
    _class_id
  );
  RETURN new;
END;
$function$;