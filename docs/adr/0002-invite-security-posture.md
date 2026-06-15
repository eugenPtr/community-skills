# Invites are bearer codes with no expiry and no revoke

Admins generate invites in batches of 15. Each is a single-use **bearer code**: anyone
holding it can claim it by signing in with any email. Codes **never expire** and there
is **no revoke** and no status view — admins generate only.

Why: the network is small (≤1000) and fully trusted, invites are sent person-to-person
out of band, and the simplest possible flow was preferred over defensive machinery.

Consequence a future reader must know: this is deliberate, not an oversight. A leaked or
forwarded code is a **permanent, unclosable hole** — the only remedy is deleting the
resulting member by hand after the fact. We chose this knowingly. If the community grows
or trust assumptions change, revisit by adding (in rough priority) revoke, then a
status/audit view, then expiry — none of which require reworking the bearer-code model
itself.
