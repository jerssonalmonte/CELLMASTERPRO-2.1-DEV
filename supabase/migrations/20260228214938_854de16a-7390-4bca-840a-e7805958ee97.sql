
-- Protect tenant_id and user_id columns on profiles from being changed by non-admins.
-- Similar pattern to protect_subscription_fields on tenants.

CREATE OR REPLACE FUNCTION public.protect_profile_identity_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Always prevent user_id changes (nobody should change this)
  NEW.user_id := OLD.user_id;

  -- Prevent tenant_id changes unless caller is super_admin
  IF NOT is_super_admin(auth.uid()) THEN
    NEW.tenant_id := OLD.tenant_id;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER protect_profile_identity
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_identity_fields();
