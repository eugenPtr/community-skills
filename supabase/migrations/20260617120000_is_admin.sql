-- Admin gate helper (issue #20, ADR-0007). Mirrors the recursion-safe shape of
-- is_member() (ADR-0006): a SECURITY DEFINER function that runs as owner and
-- bypasses RLS, so checking the caller's role never re-triggers the members
-- policy ("infinite recursion detected in policy", 42P17).
--
-- Backs the app-side Admin gate at the two privileged invite sites: the
-- /admin/dashboard read and the generate-invite server action. Deliberately NOT
-- a new RLS policy on invites (ADR-0007) -- the admin invite surface is read and
-- written through the service-role client in admin-gated server code.
create or replace function public.is_admin()
  returns boolean
  language sql
  security definer
  stable
  set search_path = public
as $$
  select exists (
    select 1 from members where id = auth.uid() and role = 'admin'
  );
$$;
