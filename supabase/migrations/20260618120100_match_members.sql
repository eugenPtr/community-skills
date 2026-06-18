-- People Search retrieval (issue #23). Cosine nearest-neighbour over member
-- embeddings, filtered by a similarity floor and capped at match_count, best
-- first. The query turn is embedded by the caller and passed in.
--
-- SECURITY INVOKER (the default): the function runs as the calling role, so the
-- RLS SELECT policy on `profiles` ("readable by members", ADR-0006) is enforced
-- here. Called through the authenticated Member's cookie-bound client, a
-- non-member sees nothing -- the Member gate lives in the database, not the
-- route. The searcher self-exclusion is the orchestrator's job (searchMembers),
-- keeping this signature the stable retrieval primitive.
--
-- Returns Heart Project as its raw columns (description + seeking flag) so the
-- caller can format the "seeking" vs described variants for the LLM.
create or replace function match_members(
  query_embedding vector(1536),
  match_count int,
  min_similarity float
)
returns table (
  member_id uuid,
  first_name text,
  last_name text,
  skills text,
  passions text,
  heart_project_description text,
  heart_project_seeking boolean,
  similarity float
)
language sql
stable
as $$
  select
    p.member_id,
    p.first_name,
    p.last_name,
    p.skills,
    p.passions,
    p.heart_project_description,
    p.heart_project_seeking,
    1 - (p.embedding <=> query_embedding) as similarity
  from profiles p
  where p.embedding is not null
    and 1 - (p.embedding <=> query_embedding) >= min_similarity
  order by p.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function match_members(vector, int, float) to authenticated, service_role;
