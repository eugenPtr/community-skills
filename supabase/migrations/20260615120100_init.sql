create type member_role as enum ('member', 'admin');

create table members (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role member_role not null default 'member',
  created_at timestamptz not null default now()
);

create table invites (
  code text primary key,
  claimed_by uuid references members(id) on delete set null,
  claimed_at timestamptz,
  -- The Admin who minted this invite (issue #20). Nullable: invites that
  -- predate the Admin Dashboard have no recorded author and render blank.
  generated_by uuid references members(id) on delete set null,
  created_at timestamptz not null default now()
);

create index invites_unclaimed_idx on invites (code) where claimed_by is null;

alter table members enable row level security;
alter table invites enable row level security;

-- Atomic claim: bind a single-use code to the calling Member and create the
-- Member row in one transaction. Distinct sqlstates (P0001 / P0002) let the
-- caller surface the right error.
--
-- Takes user_id + email explicitly rather than reading auth.uid() so the same
-- function is exercisable from the integration-test seam (S1) without an
-- auth.users row. In production the server action passes the authenticated
-- user it just got from supabase.auth.getUser().
create or replace function claim_invite(
  p_user_id uuid,
  p_email text,
  p_code text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite invites%rowtype;
begin
  if p_user_id is null then
    raise exception 'unauthenticated' using errcode = 'P0003';
  end if;

  -- Lock the invite row for the duration of the transaction so a concurrent
  -- claim of the same code blocks until we commit (or roll back) and then
  -- sees claimed_by set.
  select * into v_invite from invites where code = p_code for update;

  if not found then
    raise exception 'invite_not_found' using errcode = 'P0001';
  end if;

  if v_invite.claimed_by is not null then
    raise exception 'invite_already_claimed' using errcode = 'P0002';
  end if;

  insert into members (id, email)
  values (p_user_id, p_email)
  on conflict (id) do update set email = excluded.email;

  update invites
  set claimed_by = p_user_id, claimed_at = now()
  where code = p_code;

  return p_user_id;
end;
$$;

-- Only the server (with the service role) calls this function. Locking it
-- down at the role level keeps a malicious authenticated caller from binding
-- an invite to a different user_id via direct PostgREST RPC.
revoke execute on function claim_invite(uuid, text, text) from public;
revoke execute on function claim_invite(uuid, text, text) from anon, authenticated;
