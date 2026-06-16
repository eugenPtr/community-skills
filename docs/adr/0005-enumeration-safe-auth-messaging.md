# Enumeration-safe auth messaging

The sign-in page never reveals whether an email belongs to a Member. When a user
requests a magic link, the response is always the same neutral confirmation —
*"If an account exists for this email, a link was sent"* — regardless of whether a
link was actually sent.

Authentication is gated on the **Member row** (see CONTEXT.md): Supabase auth only
proceeds when either the email already has a `members` row (returning Member) or a
valid Invite is attached to the sign-in (new Member). The Member check happens first;
an attached Invite is only consulted when the email is not yet a Member.

The three send-time outcomes:

- **Email is a Member** → send the magic link. Show the neutral confirmation.
- **Not a Member, valid Invite attached** → send the magic link (creates the auth user),
  callback carries the Invite to onboarding. Show the neutral confirmation.
- **Not a Member, no/invalid Invite** → send nothing. Show the **same** neutral
  confirmation. (An invalid or already-claimed Invite is surfaced as an explicit error,
  because Invite validity is not membership disclosure — the sign-in page already reveals
  it on load.)

Why: the network is private. Telling an arbitrary visitor "no Member on this email"
turns the sign-in form into a membership oracle — anyone could probe emails and learn
who belongs. The neutral message closes that leak.

Cost we accept: a genuine outsider who lands on sign-in without an Invite gets **no
guidance** — no "contact the admin for an invite" hint — because any message that
distinguishes their case from a Member's is the leak. They see the neutral confirmation
and wait for an email that never arrives. We chose privacy over hand-holding for this
case.

Tension with ADR-0002 a future reader must know: ADR-0002 sets a deliberately minimal
security posture ("fully trusted" network, "simplest possible flow over defensive
machinery", bearer Invite codes that are wide open). Enumeration protection is defensive
machinery and looks inconsistent next to wide-open Invite codes. It is a different axis —
**membership disclosure** (who is in the network) versus **Invite-code security** (who can
join). We harden the first while leaving the second per ADR-0002. If that ever feels
incoherent, this is the seam to revisit.

This is reversible — the messaging is a few lines of wording — but it sets the precedent
for how auth surfaces speak, hence the record.
