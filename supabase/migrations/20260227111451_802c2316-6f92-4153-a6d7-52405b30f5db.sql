
-- Create a security definer function to get profiles with emails (admin only)
CREATE OR REPLACE FUNCTION public.get_profiles_with_email()
RETURNS TABLE (
  id UUID,
  user_id TEXT,
  hospital_name TEXT,
  owner_name TEXT,
  phone TEXT,
  is_active BOOLEAN,
  is_configured BOOLEAN,
  trial_days INTEGER,
  trial_start TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
    SELECT
      p.id, p.user_id, p.hospital_name, p.owner_name, p.phone,
      p.is_active, p.is_configured, p.trial_days, p.trial_start, p.created_at,
      u.email::text
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id::text = p.user_id
    ORDER BY p.created_at DESC;
END;
$$;
