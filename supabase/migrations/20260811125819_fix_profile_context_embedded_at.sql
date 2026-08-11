-- The profile context timestamp was renamed when People Search was split into
-- separate Resource and Profile indexes. Keep profile updates on the renamed
-- column; `embedded_at` now belongs only to Resources.
create or replace function update_own_profile(
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
    profile_context_embedding_input = p_profile->>'profile_context_embedding_input',
    profile_context_embedded_at = now()
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
