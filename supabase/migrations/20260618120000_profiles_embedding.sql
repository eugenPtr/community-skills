-- People Search embedding (issue #23, ADR-0008). One combined vector per
-- Member, built from Skills + Heart Project + Passions by buildEmbeddingInput
-- and written by embedMember. `embedding_input` stores the exact text embedded
-- (for debugging / re-embed diffing); `embedded_at` marks the last embed.
--
-- vector(1536) is locked to openai/text-embedding-3-small (ADR-0008). Nullable:
-- a Member exists before their first embed (onboarding writes the profile, then
-- embeds), and the seed/backfill fill it in.
alter table profiles
  add column embedding vector(1536),
  add column embedding_input text,
  add column embedded_at timestamptz;
