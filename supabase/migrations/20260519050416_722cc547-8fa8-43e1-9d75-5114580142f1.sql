
-- 1. Change default for is_active to false (new signups inactive until admin approves)
ALTER TABLE public.profiles ALTER COLUMN is_active SET DEFAULT false;

-- 2. Update handle_new_user trigger function to insert inactive profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, is_active)
  VALUES (NEW.id, false);
  RETURN NEW;
END;
$function$;

-- 3. Assign admin role to arvindsoftwarecompany@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('f4cd9d3c-b512-4e42-aa29-8f62952e94d5', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Ensure admin account is active
UPDATE public.profiles SET is_active = true WHERE user_id = 'f4cd9d3c-b512-4e42-aa29-8f62952e94d5';
