# Supabase-centric stack with a single external LLM key

> **Embedding decision superseded by ADR-0008.** The `gte-small` in-stack embedding choice
> below was reversed once we confirmed all member content is Romanian (gte-small is
> English-centric). Embeddings now run on OpenAI `text-embedding-3-small` via the Vercel AI
> Gateway. The rest of this ADR (Supabase for auth/Postgres/pgvector/RLS, one external key)
> still holds — the Gateway preserves the single-key goal.

Auth (magic-link), Postgres, pgvector, RLS, **and embeddings** all live in Supabase.
Embeddings are computed in-stack with Supabase's built-in `gte-small` model via Edge
Functions. The only external AI vendor is Anthropic (Claude Haiku 4.5) for generating
People Search answers.

Why: we wanted exactly **one** third-party API key to manage. Claude has no embeddings
endpoint, so using Claude for generation would normally force a second vendor key
(OpenAI or Voyage) just for embeddings. Running `gte-small` inside Supabase removes that
second key entirely and keeps profile text in-stack (a privacy win for a private
community).

Trade-off accepted: `gte-small` (384-dim) is weaker than OpenAI `text-embedding-3-small`
or Voyage. For semantic people-search over ≤1000 members — retrieve ~top 10, let Claude
reason over full profiles — it is more than sufficient. If retrieval quality ever
disappoints, swap the embed step for Voyage/OpenAI; only the vector dimension and the
embed call change, the schema and search flow stay. Auth and data are now coupled to
Supabase; moving off it would be a meaningful migration.
