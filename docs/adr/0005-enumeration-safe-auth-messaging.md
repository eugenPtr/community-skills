# Enumeration-safe auth messaging

The sign-in page never reveals whether an email belongs to a Member. When a user
requests a magic link, the response is always the same neutral confirmation —
*"If an account exists for this email, a link was sent"* — regardless of whether a
link was actually sent.

Authentication is gated on the **Member row** (see CONTEXT.md): Supabase auth only
proceeds when either the email already has a `members` row (returning Member) or a
valid Invite is attached to the sign-in (new Member). The Member check happens first;
an attached Invite is only consulted when the email is not yet a Member.

The four send-time outcomes:

- **Email is a Member, valid Invite attached** (invite mode) → send the magic link. Show the
  **definite** confirmation — the full-page *"Check your inbox"* panel.
- **Not a Member, valid Invite attached** (invite mode) → send the magic link (creates the
  auth user), callback carries the Invite to onboarding. Show the same **definite** panel.
- **Email is a Member, no Invite** → send the magic link. Show the **neutral** confirmation.
- **Not a Member, no/invalid Invite** → send nothing. Show the **neutral** confirmation.
  (An invalid or already-claimed Invite is surfaced as an explicit error, because Invite
  validity is not membership disclosure — the sign-in page already reveals it on load.)

Invite mode is keyed on a valid Invite riding the sign-in. In that mode a magic link is
**always** sent — to a Member and a new Member alike — so the definite "Check your inbox"
panel is always honest and is shown identically for both. A holder of a valid Invite
therefore *cannot* distinguish Members from non-Members through the confirmation: this
closes the membership-disclosure leak in the invite case. The neutral confirmation covers
every non-invite path and protects against an attacker with **no** Invite, which is the
case that matters.

The definite confirmation is a **full-page panel, not a toast** — by the time it shows, the
email form is gone, so there is no transient feedback for a toast to accompany. The neutral
confirmation stays a toast on the still-present form.

(Earlier this decision shipped a definite *toast* only for the not-a-Member invite path,
leaving a deliberate leak: a valid-Invite holder could tell Members from non-Members by the
message. Showing the identical panel for both invite sub-cases removed that leak at no
honesty cost, since a link is sent in both.)

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
