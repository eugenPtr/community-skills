-- Member-readable network (ADR-0006). Every Member can read every other
-- Member's full profile -- the read model the Community and Profile pages
-- depend on. Expressed as RLS SELECT policies so the database enforces the
-- Member gate once for the cookie-bound `authenticated` client, instead of
-- each page re-checking membership with the service-role key.
--
-- Predicate: the caller already has a `members` row (finished onboarding). An
-- authenticated user mid-onboarding (auth.users row, no members row) reads
-- nothing. No write policies -- editing, when it ships for /profile, brings its
-- own owner-scoped policy.
--
-- The membership check is a SECURITY DEFINER function rather than an inline
-- `exists (select 1 from members ...)`: the policy on `members` would otherwise
-- query `members`, re-triggering its own policy -> "infinite recursion detected
-- in policy" (42P17). A definer function runs as owner and bypasses RLS, so the
-- check resolves once. Same predicate as ADR-0006, recursion-safe.

create or replace function public.is_member()
  returns boolean
  language sql
  security definer
  stable
  set search_path = public
as $$
  select exists (select 1 from members where id = auth.uid());
$$;

create policy "members readable by members"
  on members for select
  using (public.is_member());

create policy "profiles readable by members"
  on profiles for select
  using (public.is_member());

create policy "socials readable by members"
  on socials for select
  using (public.is_member());
