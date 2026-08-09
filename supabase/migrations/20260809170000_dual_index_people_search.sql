alter table profiles
  add column profile_context_embedding vector(1536),
  add column profile_context_embedding_input text,
  add column profile_context_embedded_at timestamptz,
  add constraint profiles_context_embedding_complete check (
    (profile_context_embedding is null and profile_context_embedding_input is null and profile_context_embedded_at is null)
    or
    (profile_context_embedding is not null and profile_context_embedding_input is not null and profile_context_embedded_at is not null)
  );

create index resources_embedding_hnsw
  on resources using hnsw (embedding vector_cosine_ops);
create index profiles_context_embedding_hnsw
  on profiles using hnsw (profile_context_embedding vector_cosine_ops)
  where profile_context_embedding is not null;

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
  insert into profiles (
    member_id, first_name, last_name, location, passions,
    heart_project_description, heart_project_seeking,
    profile_context_embedding, profile_context_embedding_input, profile_context_embedded_at
  ) values (
    p_user_id, p_profile->>'first_name', p_profile->>'last_name',
    p_profile->>'location', p_profile->>'passions',
    nullif(p_profile->>'heart_project_description', ''),
    (p_profile->>'heart_project_seeking')::boolean,
    (p_profile->>'profile_context_embedding')::vector,
    p_profile->>'profile_context_embedding_input', now()
  );
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

drop function match_members(vector, int, float);

create function match_resources(
  query_embedding vector(1536), match_count int, min_similarity float
) returns table (
  member_id uuid, first_name text, last_name text,
  resource_id uuid, description text, classification resource_classification,
  similarity float
) language sql stable as $$
  select p.member_id, p.first_name, p.last_name, r.id, r.description, r.classification,
    1 - (r.embedding <=> query_embedding)
  from resources r join profiles p on p.member_id = r.member_id
  where 1 - (r.embedding <=> query_embedding) >= min_similarity
  order by r.embedding <=> query_embedding
  limit match_count;
$$;

create function match_profile_contexts(
  query_embedding vector(1536), match_count int, min_similarity float
) returns table (
  member_id uuid, first_name text, last_name text, passions text,
  heart_project_description text, heart_project_seeking boolean,
  similarity float
) language sql stable as $$
  select p.member_id, p.first_name, p.last_name, p.passions,
    p.heart_project_description, p.heart_project_seeking,
    1 - (p.profile_context_embedding <=> query_embedding)
  from profiles p
  where p.profile_context_embedding is not null
    and 1 - (p.profile_context_embedding <=> query_embedding) >= min_similarity
  order by p.profile_context_embedding <=> query_embedding
  limit match_count;
$$;
