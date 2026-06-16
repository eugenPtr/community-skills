# Claim invite at onboarding completion, not at auth callback

The invite is claimed — and the Member row created — only when the member submits
their completed Profile at the end of onboarding. The auth callback (magic-link exchange)
establishes a Supabase session but deliberately does not touch the `members` or `invites`
tables. The invite code travels through the URL (`/onboarding?invite=CODE`) until final
submission.

Why: we want the invite to remain unclaimed if the user abandons mid-flow. An abandoned
onboarding means no Member row, no claimed invite, and no state to clean up — the user
simply starts over from the invite link. The alternative (claim at auth callback, then
hide the member behind a draft flag until onboarding completes) creates orphaned draft
rows and a two-phase cleanup problem when the user never returns.

Consequences a future reader must know:

- The auth callback route must NOT call `claim_invite()`. A reader seeing a session
  established without a corresponding member row should not "fix" this.
- Authenticated users without a `members` row are expected and transient — they are
  mid-onboarding, not a bug.
- The invite code must be validated (exists + unclaimed) server-side when the sign-in
  page loads, before the user enters their email. This is the only user-facing gate;
  the atomic DB claim at onboarding completion is the real lock.
- If two users race to claim the same code, the second receives an error at onboarding
  submission. The first writer wins; the second must contact the admin.
