# Merge Resource offers with Profile-context search evidence

## Type

AFK

## What to build

Implement ADR-0010's dual-index retrieval so People Search can find explicit Resource providers and
Members whose Passions or Heart Project are relevant. Merge all evidence into one candidate per
Member, rank offers first for help-seeking questions, and make answer generation describe the exact
relationship to the topic without turning interest into an offer.

Covers user stories 41–44 and 48 from the Resources PRD.

## Acceptance criteria

- [ ] Each Resource has an embedding made from its own description; Passions and Heart Project form
      one separate Profile-context embedding per Member.
- [ ] Resource embeddings do not repeat the whole Profile context, and Profile-context embeddings do
      not include Resources.
- [ ] A query is embedded once and used to search both indexes with independently tunable candidate
      counts and similarity thresholds.
- [ ] Retrieval merges signals by Member so each Member appears once and retains every relevant
      evidence item and evidence type.
- [ ] General topic queries may return both providers and interest-only Members. Help-seeking queries
      rank matching Resource providers before interest-only matches without automatically excluding
      the latter.
- [ ] Candidate context distinguishes `free_resource`, `paid_resource`, `passion`, and
      `heart_project` evidence and includes the exact supporting text.
- [ ] Generated Romanian answers state whether a Member offers a free/paid Resource or is interested
      in the topic and never infer availability from Passion or Heart Project evidence.
- [ ] Editing one Resource requires re-embedding only that Resource; changing Passion/Heart Project
      updates only the Profile-context embedding.
- [ ] Search orchestration tests use fake embedder, retrieval, and generator dependencies to verify
      one query embedding, two retrieval paths, merge/ranking behavior, and grounded answer context.
- [ ] Local Postgres integration tests verify both pgvector searches and indexes with representative
      Romanian content.

## Blocked by

- [Issue 001](./001-publish-and-discover-classified-resources.md)

