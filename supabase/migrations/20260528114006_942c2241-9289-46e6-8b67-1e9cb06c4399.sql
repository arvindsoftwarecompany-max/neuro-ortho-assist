
-- Revoke broad EXECUTE from PUBLIC and anon on all SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_profiles_with_email() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon;

-- Grant required execute privileges
-- has_role: used in RLS policies, needs authenticated
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- get_profiles_with_email: admin RPC
GRANT EXECUTE ON FUNCTION public.get_profiles_with_email() TO authenticated, service_role;

-- Trigger functions only need service_role (triggers run as table owner anyway)
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user_role() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;
