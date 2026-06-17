# Member-readable Community via RLS policies

Members read each other's profiles through **RLS SELECT policies that admit any
caller who is already a Member**, not through service-role server reads. The policy
predicate on `members`, `profiles`, and `socials` is:

```sql
using (exists (select 1 from members m where m.id = auth.uid()))
```

In the migration this predicate is wrapped in a `SECURITY DEFINER` function
`public.is_member()` rather than inlined: a policy *on* `members` that queries
`members` re-triggers its own policy and Postgres raises "infinite recursion
detected in policy" (42P17). The definer function runs as owner and bypasses
RLS, so the check resolves once. The predicate is unchanged.

A Member, via the cookie-bound server client (role `authenticated`), can therefore
`select` every other Member's full profile — exactly what the Community needs (see
CONTEXT.md: "Every Member can see every other Member's full profile here"). An
authenticated user who has **not** completed onboarding — an `auth.users` row with no
`members` row — reads nothing, consistent with the Member-row gate established in
ADR-0005.

Before this, all three tables had RLS enabled with **zero policies**: the cookie-bound
client read nothing, and the only way to touch the data was the service-role client,
which bypasses RLS. That was correct for the privileged, write-only flows shipped so
far (`claim_invite` is locked to service_role) but leaves no read path for Member-to-
Member discovery.

## The alternative we rejected

Read every profile through the **service-role client** in the Community and profile
pages, keeping RLS at deny-all. Rejected because it pushes authorization out of the
database and into hand-written page code: every read would need the elevated key plus
a manual "is this caller a Member?" check, and any page that forgets the check leaks
the whole network. With RLS policies the database enforces the Member gate once, for
the cookie-bound client, and the service-role client stays reserved for genuinely
privileged operations.

## Consequences

- Reads are gated in one place (the policy), not re-implemented per page.
- The same policy unblocks the home page's own `members` lookup, which uses the
  cookie-bound client and currently returns nothing.
- SELECT is **all-or-nothing by membership**: there is no per-field or per-Member
  visibility. The glossary says every Member sees every other Member's *full* profile,
  so this matches intent today. If we ever want private fields or blocking, this policy
  is the seam to revisit.
- Writes are untouched — still no INSERT/UPDATE/DELETE policy, so profile editing
  (when it ships for `/profile`) needs its own owner-scoped policy or a server action.

## Why

The network's read model is "every Member sees every Member." RLS expresses that
invariant directly and enforces it for the ordinary client, so discovery features can
be built with the cookie-bound client and no bespoke authorization code. Hard to
reverse once pages depend on it, hence the record.
