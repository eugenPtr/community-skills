# People Search embeds via Vercel AI Gateway (OpenAI), not in-stack gte-small

Supersedes the embedding decision in ADR-0003. People Search now embeds profile text
and queries with OpenAI `text-embedding-3-small` (1536-dim) reached through the **Vercel
AI Gateway**, and generates answers with Claude Haiku 4.5 through the same Gateway. Auth,
Postgres, pgvector, and RLS still live in Supabase — only the embed step moved out.

Why the change: ADR-0003 chose Supabase's built-in `gte-small` to keep one vendor key and
keep profile text in-stack. That decision predates a hard requirement we have since
confirmed — **all member content is Romanian**. `gte-small` is a 384-dim, English-centric
model; it matches Romanian skills/passions poorly, so "cine construiește case din materiale
naturale" would not reliably find a profile written "construiesc case cu materiale
naturale". Semantic search in Romanian needs a multilingual embedder, which Supabase's
in-stack option does not provide.

Why the Gateway specifically: Claude has no embeddings endpoint, so a multilingual embedder
would normally reintroduce a second vendor key (OpenAI/Voyage) — the exact thing ADR-0003
and ADR-0001 wanted to avoid. The Vercel AI Gateway dissolves this: one credential
(`AI_GATEWAY_API_KEY`), one bill, routing to **both** the OpenAI embedding model and Claude.
So the "one key" goal of ADR-0003 survives intact; only the key's identity and the embedder
change. We are already deployed on Vercel, so the Gateway adds no new platform.

Trade-off accepted — profile text leaves the stack. ADR-0003 valued keeping member text
inside Supabase for a private community. Embedding via the Gateway sends names/skills/
passions to OpenAI. We accept this: the Gateway path is zero-retention and the OpenAI API
does not train on API data. If that posture ever becomes unacceptable, the fix is to stand
up a multilingual embedder behind a Supabase Edge Function; only the embed call and the
vector dimension change — the schema, HNSW index, and retrieve-then-generate flow stay.

Trade-off accepted — dimension lock-in. The `profiles` vector column is fixed to
`vector(1536)`. Swapping the embedding model later means a column change plus re-embedding
every member. At ≤1000 rows that backfill is seconds and fractions of a cent (see the
`embedMember` / backfill primitive), so the lock-in is cheap to undo.
