# Apply conversational free/paid Resource constraints

## Type

AFK

## What to build

Understand cost intent from natural Romanian People Search queries without adding visible filter
controls. Classify each request as unconstrained, free, or paid before retrieval and enforce explicit
cost intent as a hard Resource filter rather than relying on answer generation to hide contradictory
matches.

Covers user stories 45–47 from the Resources PRD.

## Acceptance criteria

- [ ] A lightweight structured AI step returns only `any`, `free`, or `paid` and handles common
      Romanian formulations such as „gratis”, „gratuit”, „fără plată”, and „contra cost”.
- [ ] The intent step uses the Vercel AI Gateway with feature/user attribution and has no direct
      provider wiring.
- [ ] `any` searches both Resource classifications and Profile context according to dual-index
      retrieval behavior.
- [ ] `free` searches only free Resources; `paid` searches only paid Resources.
- [ ] Explicit `free` or `paid` intent excludes Profile-context-only matches because Passion or Heart
      Project evidence cannot satisfy a commercial constraint.
- [ ] Answer generation receives and respects the resolved intent and cannot reintroduce candidates
      excluded by retrieval.
- [ ] The People Search interface remains conversational and exposes no **Toate / Gratis / Contra
      cost** control.
- [ ] Tests cover direct and indirect Romanian cost phrasing, ambiguous/unconstrained phrasing,
      strict database filtering, and no-result answers through fake classifier and retrieval seams.

## Blocked by

- [Issue 006](./006-merge-resource-and-profile-search-evidence.md)

