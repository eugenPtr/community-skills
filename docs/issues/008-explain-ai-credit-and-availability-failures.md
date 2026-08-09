# Explain AI credit and availability failures

## Type

AFK

## What to build

Give Members accurate, provider-neutral explanations when synchronous Resource indexing or People
Search cannot proceed. Distinguish exhausted AI credits from rate limits and other availability
failures, preserve atomic save behavior, and present the message through one accessible responsive
dialog without introducing donation or support actions.

Covers user stories 49–53 from the Resources PRD.

## Acceptance criteria

- [ ] AI Gateway HTTP `402` maps to the insufficient-credit state; rate limiting and other failures
      remain distinct and are not described as exhausted credits.
- [ ] A `402` during Resource embedding leaves onboarding or the focused editor unsaved and shows:
      **Soldul de credite AI este insuficient. Modificările nu au fost salvate. Ia în considerare o
      donație și contactează echipa tehnică pentru realimentare.**
- [ ] A `402` during People Search returns no fabricated answer and shows: **Soldul de credite AI
      este insuficient. Căutarea nu poate fi efectuată momentan. Ia în considerare o donație și
      contactează echipa tehnică pentru realimentare.**
- [ ] Other Gateway availability failures show: **Serviciul AI nu este disponibil momentan. Încearcă
      din nou mai târziu.**
- [ ] Desktop presents a centered modal; mobile presents a content-sized bottom sheet with a maximum
      height of two-thirds of the viewport.
- [ ] The dialog provides a top-right ×, bottom **Închide**, backdrop dismissal, and Escape dismissal,
      while trapping focus when open and restoring focus to the trigger when closed.
- [ ] The dialog remains informational and contains no donation link, payment integration, support
      address, or direct provider/API terminology.
- [ ] Rendered failure tests verify exact user-visible outcomes, no partial saves or fabricated search
      content, all dismissal methods, focus behavior, and responsive dialog semantics.

## Blocked by

- [Issue 001](./001-publish-and-discover-classified-resources.md)
- [Issue 007](./007-apply-conversational-resource-cost-constraints.md)
