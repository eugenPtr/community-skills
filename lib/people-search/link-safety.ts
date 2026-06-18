// Render-time link whitelist (issue #23, user story 31). A second layer behind
// the system prompt: even if the model ever emitted an external or malformed
// link, only internal Member-facing hrefs render as anchors. Everything else is
// dropped to plain text. People Search must never render a hallucinated link.
//
// Allowed: /profile/<id> (a Member's Profile) and /members (the Directory).
export function isInternalHref(href: string | undefined): boolean {
  if (!href) return false;
  return /^\/(profile\/[^/\s]+|members)\/?$/.test(href);
}
