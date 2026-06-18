-- Production-only: HNSW index for cosine nearest-neighbour over member
-- embeddings (issue #23). A performance concern, not behaviour -- match_members
-- returns the same rows with or without it -- so the PGlite test harness skips
-- this migration and exercises match_members on a sequential scan.
create index profiles_embedding_hnsw_idx
  on profiles using hnsw (embedding vector_cosine_ops);
