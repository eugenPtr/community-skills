create type resource_classification as enum ('free', 'paid');

create table resources (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  description text not null,
  classification resource_classification not null,
  position smallint not null,
  embedding vector(1536) not null,
  embedding_input text not null,
  embedded_at timestamptz not null default now(),
  constraint resources_description_normalized check (
    description = btrim(description)
    and char_length(description) between 1 and 255
    and description !~ E'[\n\r]'
  ),
  constraint resources_position_nonnegative check (position >= 0),
  constraint resources_position_unique unique (member_id, classification, position)
);

create unique index resources_description_unique
  on resources (member_id, lower(description));

create or replace function enforce_resource_category_limit()
returns trigger language plpgsql as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.member_id::text || ':' || new.classification::text, 0));
  if (select count(*) from resources
      where member_id = new.member_id and classification = new.classification) >= 10 then
    raise exception 'resource_category_limit' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger resources_category_limit
before insert on resources
for each row execute function enforce_resource_category_limit();

alter table resources enable row level security;
create policy "resources readable by members"
  on resources for select using (public.is_member());
create policy "members insert own resources"
  on resources for insert with check (member_id = auth.uid() and public.is_member());
create policy "members update own resources"
  on resources for update using (member_id = auth.uid()) with check (member_id = auth.uid());
create policy "members delete own resources"
  on resources for delete using (member_id = auth.uid());

create or replace function complete_onboarding(
  p_user_id uuid,
  p_email text,
  p_code text,
  p_profile jsonb,
  p_socials jsonb,
  p_resources jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_invite invites%rowtype;
begin
  if p_user_id is null then raise exception 'unauthenticated' using errcode = 'P0003'; end if;
  select * into v_invite from invites where code = p_code for update;
  if not found then raise exception 'invite_not_found' using errcode = 'P0001'; end if;
  if v_invite.claimed_by is not null then raise exception 'invite_already_claimed' using errcode = 'P0002'; end if;
  if jsonb_array_length(p_resources) < 1 then raise exception 'resource_required' using errcode = '23514'; end if;

  insert into members (id, email) values (p_user_id, p_email)
  on conflict (id) do update set email = excluded.email;
  insert into profiles (member_id, first_name, last_name, location, passions,
    heart_project_description, heart_project_seeking)
  values (p_user_id, p_profile->>'first_name', p_profile->>'last_name',
    p_profile->>'location', p_profile->>'passions',
    nullif(p_profile->>'heart_project_description', ''),
    (p_profile->>'heart_project_seeking')::boolean);
  insert into socials (member_id, phone, email, website, linkedin, facebook, instagram, x)
  values (p_user_id, p_socials->>'phone', p_socials->>'email',
    nullif(p_socials->>'website',''), nullif(p_socials->>'linkedin',''),
    nullif(p_socials->>'facebook',''), nullif(p_socials->>'instagram',''), nullif(p_socials->>'x',''));
  insert into resources (member_id, description, classification, position, embedding, embedding_input)
  select p_user_id, r.description, r.classification::resource_classification, r.position,
    r.embedding::vector, r.description
  from jsonb_to_recordset(p_resources) as r(description text, classification text, position smallint, embedding text);
  update invites set claimed_by = p_user_id, claimed_at = now() where code = p_code;
  return p_user_id;
end;
$$;

revoke execute on function complete_onboarding(uuid,text,text,jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function complete_onboarding(uuid,text,text,jsonb,jsonb,jsonb) to service_role;

drop function match_members(vector, int, float);
create function match_members(
  query_embedding vector(1536), match_count int, min_similarity float
) returns table (
  member_id uuid, first_name text, last_name text, passions text,
  heart_project_description text, heart_project_seeking boolean,
  resource_description text, resource_classification resource_classification,
  similarity float
) language sql stable as $$
  select p.member_id, p.first_name, p.last_name, p.passions,
    p.heart_project_description, p.heart_project_seeking,
    r.description, r.classification, 1 - (r.embedding <=> query_embedding)
  from resources r join profiles p on p.member_id = r.member_id
  where 1 - (r.embedding <=> query_embedding) >= min_similarity
  order by r.embedding <=> query_embedding
  limit match_count;
$$;

alter table profiles drop column skills;
alter table profiles drop column embedding;
alter table profiles drop column embedding_input;
alter table profiles drop column embedded_at;

-- Replace the authenticated Member's complete Resource set in one transaction.
-- Embeddings are prepared by the server before this RPC, so any Gateway failure
-- happens before the published rows are touched. Stable ids are retained for
-- existing Resources; missing ids are deleted and new ids are inserted.
create or replace function replace_own_resources(p_resources jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_member_id uuid := auth.uid();
begin
  if v_member_id is null or not exists (select 1 from members where id = v_member_id) then
    raise exception 'not_a_member' using errcode = 'P0003';
  end if;
  if jsonb_typeof(p_resources) <> 'array' or jsonb_array_length(p_resources) < 1 then
    raise exception 'resource_required' using errcode = '23514';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_resources)
      as r(description text, classification text, position smallint)
    where r.description <> btrim(r.description)
      or char_length(r.description) not between 1 and 255
      or r.description ~ E'[\n\r]'
      or r.classification not in ('free', 'paid')
      or r.position < 0
  ) then raise exception 'invalid_resource' using errcode = '23514'; end if;
  if exists (
    select 1 from jsonb_to_recordset(p_resources) as r(classification text)
    group by r.classification having count(*) > 10
  ) then raise exception 'resource_category_limit' using errcode = '23514'; end if;
  if exists (
    select 1 from jsonb_to_recordset(p_resources) as r(description text)
    group by lower(r.description) having count(*) > 1
  ) then raise exception 'duplicate_resource' using errcode = '23505'; end if;
  if exists (
    select 1 from jsonb_to_recordset(p_resources) as r(classification text, position smallint)
    group by r.classification, r.position having count(*) > 1
  ) then raise exception 'duplicate_position' using errcode = '23505'; end if;

  perform 1 from resources where member_id = v_member_id for update;

  -- Clear unique values inside the transaction so description swaps and
  -- arbitrary reorder/reclassification cannot collide mid-update.
  update resources
    set position = position + 100,
        description = id::text
    where member_id = v_member_id;

  delete from resources existing
  where existing.member_id = v_member_id
    and not exists (
      select 1 from jsonb_to_recordset(p_resources) as wanted(id uuid)
      where wanted.id = existing.id
    );

  update resources existing set
    description = wanted.description,
    classification = wanted.classification::resource_classification,
    position = wanted.position,
    embedding = wanted.embedding::vector,
    embedding_input = wanted.embedding_input,
    embedded_at = case
      when existing.embedding_input = wanted.embedding_input then existing.embedded_at
      else now()
    end
  from jsonb_to_recordset(p_resources) as wanted(
    id uuid, description text, classification text, position smallint,
    embedding text, embedding_input text
  )
  where existing.member_id = v_member_id and existing.id = wanted.id;

  insert into resources (
    id, member_id, description, classification, position,
    embedding, embedding_input, embedded_at
  )
  select wanted.id, v_member_id, wanted.description,
    wanted.classification::resource_classification, wanted.position,
    wanted.embedding::vector, wanted.embedding_input, now()
  from jsonb_to_recordset(p_resources) as wanted(
    id uuid, description text, classification text, position smallint,
    embedding text, embedding_input text
  )
  where not exists (select 1 from resources existing where existing.id = wanted.id);
end;
$$;

revoke execute on function replace_own_resources(jsonb) from public, anon;
grant execute on function replace_own_resources(jsonb) to authenticated;
