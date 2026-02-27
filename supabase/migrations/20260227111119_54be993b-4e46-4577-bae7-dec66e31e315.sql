
-- Check user_id type and create policies accordingly
-- Use explicit CAST for both sides
CREATE POLICY "Users and admins can view profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR CAST(user_id AS text) = CAST(auth.uid() AS text)
  );

CREATE POLICY "Users and admins can update profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR CAST(user_id AS text) = CAST(auth.uid() AS text)
  );
