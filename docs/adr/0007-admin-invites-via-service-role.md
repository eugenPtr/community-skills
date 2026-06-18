# Admin invite reads and generation via service-role server code

The Admin Dashboard reads **every** invite — joined to `profiles` for the
claimer's and generator's names — and generates new invites, both through the
**service-role client in admin-gated server code**, not through RLS policies or a
Postgres function.

Concretely:

- **Read.** `/admin/dashboard` is a server component. It resolves the caller,
  redirects a non-Admin (`role <> 'admin'`) to `/` and an unauthenticated visitor
  to `/sign-in`, then queries all invites with the service-role client (which
  bypasses RLS). `invites` keeps RLS enabled with **no admin SELECT policy**.
- **Generate.** A server action re-verifies the caller is an Admin, builds a code
  (`INV-XXXX-XXXX`, random, deduped by the `code` primary key with a retry on
  conflict), and inserts it with `generated_by` set to the Admin's member id —
  again via the service-role client.

A new `public.is_admin()` `SECURITY DEFINER` helper backs the gate checks (same
recursion-safe shape as `is_member()` from ADR-0006).

## The alternatives we rejected

**An RLS admin-read policy on `invites`** (`using (public.is_admin())`), read via
the cookie-bound client — the path ADR-0006 chose for Member-to-Member profile
reads. Rejected here because the trade-off that drove ADR-0006 is inverted:
Member reads are a high-frequency path spread across many discovery pages, where
one forgotten check leaks the network, so gating once in the database wins. Admin
invite visibility is the opposite: a **single** page, a **single** privileged
role, and a narrow surface. Generation already needs the service-role client
regardless, so an RLS read policy would split the admin flow across two
enforcement models (DB policy for reads, app code for writes) for no real safety
gain.

**A `generate_invite` Postgres RPC**, mirroring `claim_invite`. Rejected because
`claim_invite` is an RPC for a specific reason — it must lock the invite row
(`select ... for update`), insert the member, and update the invite atomically so
two concurrent claims can't both win (ADR-0004). Generation has no such race: one
Admin inserts one fresh code, and the only collision is caught by the primary
key. Keeping it a server action keeps the admin logic — code generation, retry,
the admin re-check — in one readable place in app code.

## Consequences

- The privileged surface for invites is concentrated in **one admin-gated page +
  one server action**, not spread across DB policies. The cost: authorization for
  this flow lives in hand-written code, so the Admin re-check must be present in
  both the page (read) and the action (generate) — losing the "DB enforces it
  once" property ADR-0006 prizes. Accepted because the surface is exactly two
  call sites, both Admin-gated.
- `invites` RLS stays deny-all for the cookie-bound client. A future reader who
  sees RLS enabled with no admin policy should look here, not assume an omission.
- If invite visibility ever needs to widen (e.g. an Admin sees only invites they
  generated, or Members see their own), revisit whether an RLS policy now earns
  its keep.

## Why

Reads (ADR-0006) and writes (`claim_invite`) here deliberately diverge from the
repo's established DB-boundary patterns. The divergence is principled — driven by
frequency, surface size, and atomicity needs, not convenience — and surprising
enough without context that it's worth recording so the next engineer doesn't
"fix" it by adding an RLS policy or an RPC.
