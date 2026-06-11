-- Drop legacy overlapping policies on profiles that bypass activation gating
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users and admins can update profiles" ON public.profiles;

-- Recreate update policy: admins always; users only when their profile is active
CREATE POLICY "Users and admins can update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (user_id = auth.uid() AND is_active = true)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (user_id = auth.uid() AND is_active = true)
);
