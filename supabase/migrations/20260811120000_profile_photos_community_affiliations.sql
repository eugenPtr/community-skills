create table affiliated_communities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  constraint affiliated_communities_name_normalized check (name = btrim(name) and name <> '')
);

insert into affiliated_communities (name) values
  ('ManKind Project'),
  ('Bărbați în Comuniune'),
  ('Bărbați la Fain');

create table profile_community_affiliations (
  member_id uuid not null references profiles(member_id) on delete cascade,
  community_id uuid not null references affiliated_communities(id) on delete restrict,
  primary key (member_id, community_id)
);

insert into profile_community_affiliations (member_id, community_id)
select p.member_id, c.id
from profiles p
cross join affiliated_communities c
where c.name = 'Bărbați la Fain';

alter table profiles add column profile_photo_path text;

alter table affiliated_communities enable row level security;
alter table profile_community_affiliations enable row level security;
create policy "communities readable by members" on affiliated_communities
  for select using (public.is_member());
create policy "affiliations readable by members" on profile_community_affiliations
  for select using (public.is_member());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "profile photos readable by members" on storage.objects
  for select to authenticated
  using (bucket_id = 'profile-photos' and public.is_member());
create policy "members upload own profile photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text and public.is_member());
create policy "members delete own profile photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop function complete_onboarding(uuid,text,text,jsonb,jsonb,jsonb);
create function complete_onboarding(
  p_user_id uuid, p_email text, p_code text, p_profile jsonb,
  p_socials jsonb, p_resources jsonb, p_community_ids uuid[]
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_invite invites%rowtype;
begin
  if p_user_id is null then raise exception 'unauthenticated' using errcode = 'P0003'; end if;
  select * into v_invite from invites where code = p_code for update;
  if not found then raise exception 'invite_not_found' using errcode = 'P0001'; end if;
  if v_invite.claimed_by is not null then raise exception 'invite_already_claimed' using errcode = 'P0002'; end if;
  if jsonb_array_length(p_resources) < 1 then raise exception 'resource_required' using errcode = '23514'; end if;
  if coalesce(array_length(p_community_ids, 1), 0) < 1 or exists (
    select 1 from unnest(p_community_ids) id
    where not exists (select 1 from affiliated_communities c where c.id = id)
  ) then raise exception 'community_required' using errcode = '23514'; end if;

  insert into members (id, email) values (p_user_id, p_email)
  on conflict (id) do update set email = excluded.email;
  insert into profiles (member_id, first_name, last_name, location, passions,
    heart_project_description, heart_project_seeking, profile_photo_path,
    profile_context_embedding, profile_context_embedding_input)
  values (p_user_id, p_profile->>'first_name', p_profile->>'last_name',
    p_profile->>'location', p_profile->>'passions', nullif(p_profile->>'heart_project_description', ''),
    (p_profile->>'heart_project_seeking')::boolean, nullif(p_profile->>'profile_photo_path', ''),
    (p_profile->>'profile_context_embedding')::vector, p_profile->>'profile_context_embedding_input');
  insert into socials (member_id, phone, email, website, linkedin, facebook, instagram, x)
  values (p_user_id, p_socials->>'phone', p_socials->>'email', nullif(p_socials->>'website',''),
    nullif(p_socials->>'linkedin',''), nullif(p_socials->>'facebook',''),
    nullif(p_socials->>'instagram',''), nullif(p_socials->>'x',''));
  insert into resources (member_id, description, classification, position, embedding, embedding_input)
  select p_user_id, r.description, r.classification::resource_classification, r.position,
    r.embedding::vector, r.description from jsonb_to_recordset(p_resources)
    as r(description text, classification text, position smallint, embedding text);
  insert into profile_community_affiliations (member_id, community_id)
  select p_user_id, distinct_id from unnest(p_community_ids) distinct_id group by distinct_id;
  update invites set claimed_by = p_user_id, claimed_at = now() where code = p_code;
  return p_user_id;
end;
$$;
revoke execute on function complete_onboarding(uuid,text,text,jsonb,jsonb,jsonb,uuid[]) from public, anon, authenticated;
grant execute on function complete_onboarding(uuid,text,text,jsonb,jsonb,jsonb,uuid[]) to service_role;

create function update_own_profile(
  p_profile jsonb, p_socials jsonb, p_resources jsonb, p_community_ids uuid[]
) returns void
language plpgsql security definer set search_path = public as $$
declare v_member_id uuid := auth.uid();
begin
  if v_member_id is null or not exists (select 1 from members where id = v_member_id) then
    raise exception 'not_a_member' using errcode = 'P0003';
  end if;
  if jsonb_array_length(p_resources) < 1 then raise exception 'resource_required' using errcode = '23514'; end if;
  if coalesce(array_length(p_community_ids, 1), 0) < 1 or exists (
    select 1 from unnest(p_community_ids) id
    where not exists (select 1 from affiliated_communities c where c.id = id)
  ) then raise exception 'community_required' using errcode = '23514'; end if;

  update profiles set first_name = p_profile->>'first_name', last_name = p_profile->>'last_name',
    location = p_profile->>'location', passions = p_profile->>'passions',
    heart_project_description = nullif(p_profile->>'heart_project_description', ''),
    heart_project_seeking = (p_profile->>'heart_project_seeking')::boolean,
    profile_photo_path = coalesce(nullif(p_profile->>'profile_photo_path', ''), profile_photo_path),
    profile_context_embedding = (p_profile->>'profile_context_embedding')::vector,
    profile_context_embedding_input = p_profile->>'profile_context_embedding_input', embedded_at = now()
  where member_id = v_member_id;
  update socials set phone = p_socials->>'phone', email = p_socials->>'email',
    website = nullif(p_socials->>'website',''), linkedin = nullif(p_socials->>'linkedin',''),
    facebook = nullif(p_socials->>'facebook',''), instagram = nullif(p_socials->>'instagram',''),
    x = nullif(p_socials->>'x','') where member_id = v_member_id;
  perform replace_own_resources(p_resources);
  delete from profile_community_affiliations where member_id = v_member_id;
  insert into profile_community_affiliations (member_id, community_id)
  select v_member_id, distinct_id from unnest(p_community_ids) distinct_id group by distinct_id;
end;
$$;
revoke execute on function update_own_profile(jsonb,jsonb,jsonb,uuid[]) from public, anon;
grant execute on function update_own_profile(jsonb,jsonb,jsonb,uuid[]) to authenticated;
