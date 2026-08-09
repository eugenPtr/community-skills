# Publish and discover classified Resources end to end

## Type

AFK

## What to build

Deliver the first complete Resource path from onboarding through persistence, synchronous semantic
indexing, provider retrieval, and read-only Profile display. Replace Skill with individually stored
free or paid Resources, discard legacy Skill data, enforce Member ownership and the core Resource
invariants, and update representative seed Members. Keep the editor deliberately basic in this
slice; later tickets add the full interaction model.

Covers user stories 1–5, 24–29, 37–38, 41, and 49 from the Resources PRD.

## Acceptance criteria

- [ ] The database stores independently identifiable Resources with Member ownership, description,
      `free`/`paid` classification, and ordered position; the legacy Skill field and data are removed.
- [ ] Database and server validation enforce descriptions of 1–255 normalized characters, at least
      one Resource per completed Member Profile, and no more than 10 Resources per classification.
- [ ] RLS allows Members to read Community Resources and prevents a Member from mutating another
      Member's Resources.
- [ ] Onboarding accepts at least one classified Resource and persists the Profile, Resources, and
      Invite completion as one successful user outcome.
- [ ] Every new Resource is embedded synchronously through Vercel AI Gateway; an indexing failure
      leaves onboarding unpublished rather than creating visible-but-unsearchable Resources.
- [ ] A need semantically matching a Resource can retrieve its owning Member through People Search.
- [ ] Read-only Profiles show non-empty **Resurse gratis** and **Resurse contra cost** sections, free
      first, with full wrapped descriptions in stored order; empty categories are hidden.
- [ ] Seed data uses individual classified Resources and contains no legacy Skill values.
- [ ] Behavior is covered through rendered onboarding/Profile tests, local database and RLS tests,
      and injected fake embedding/search dependencies; no test calls the network.

## Blocked by

None - can start immediately.

