# Local and remote database schemas are kept in sync from one migration set

The Supabase schema — local stack and every remote project — is defined by exactly
one ordered set of migrations in `supabase/migrations/`. Local and remote are
always brought to the **same** schema from that one set. There is no second
lineage and no out-of-band schema change.

## Why this ADR exists

We hit the failure this rule prevents. The remote project had drifted to a
`profiles(first_name, last_name, …)` schema while `main`'s committed migration
still created `profiles(name, …)`. The migration *history* recorded matching
version numbers (e.g. `20260615120200`) whose **content differed** — the classic
result of editing an already-applied migration on one side. Because the version
numbers collided, `supabase db push` could neither detect nor reconcile the
difference: it tried to apply a `match_members` function that selected `p.name`
against a table that only had `first_name`/`last_name`, and failed. The schemas
could not be merged incrementally at all.

## Decision

1. **One migration set is the single source of truth.** Schema, RLS, triggers,
   functions, and indexes live only in `supabase/migrations/`. No manual
   dashboard edits (reaffirms AGENTS.md "no manual dashboard changes").

2. **Never edit an applied migration to change its meaning.** Once a migration
   version has been applied anywhere (local or a remote), its content is frozen.
   A schema change is a *new* migration with a later version. Editing an applied
   migration is what produced the colliding-version drift above.

3. **New migration versions must sort strictly after every applied one.** When
   two branches add migrations independently, renumber on integration so the
   combined set is a single increasing sequence (e.g. People Search's migrations
   were renumbered to `20260618*` so they fall after `#20`'s
   `20260617120000_is_admin.sql`). Two files sharing a version prefix is a bug.

4. **Pre-launch, sync by reset, not by push, whenever histories have diverged.**
   While there is no real Member data to protect, the cheap and reliable way to
   guarantee local == remote is to rebuild both from the one set:
   `supabase db reset` (local) and `supabase db reset --linked` (remote), then
   reseed (`pnpm seed`, which also generates embeddings — ADR-0008). Incremental
   `db push` is only safe when the remote's applied history is a strict prefix of
   the local set; if it is not, reset.

## Trade-offs

- **Reset is destructive.** `db reset --linked` drops all remote data. This is
  acceptable only pre-launch (personas are disposable demo data). Once real
  Members exist, diverged history must instead be repaired with
  `supabase migration repair` + forward-only migrations — reset is no longer an
  option, which is exactly why rules 2 and 3 matter from now on.
- **Renumbering on integration is manual.** Parallel feature branches that each
  add migrations will keep needing a renumber step at merge time until work is
  serialised through one integration branch.
