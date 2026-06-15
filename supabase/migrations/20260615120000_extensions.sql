-- pgvector is enabled here so later slices (member retrieval) can add a vector
-- column. No vector column exists yet — issue #6 adds it.
create extension if not exists vector;
