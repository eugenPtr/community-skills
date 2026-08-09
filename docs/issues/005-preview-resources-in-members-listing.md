# Preview Resources in the Members listing

## Type

AFK

## What to build

Replace the obsolete Skill summary on Member cards with a compact, accessible preview of the
Member's prioritized Resources. Preserve the free-first product emphasis without relying on border
color to explain classification in the condensed card context.

Covers user stories 39–40 from the Resources PRD.

## Acceptance criteria

- [ ] Every Member card shows at most two Resources, selected from the Member's persisted ordering
      with free Resources before paid Resources.
- [ ] Every preview is prefixed with **Gratis:** or **Contra cost:** so classification does not depend
      on color.
- [ ] When more than two Resources exist, the card shows the accurate localized remainder as **+
      încă N**.
- [ ] Cards with only free, only paid, mixed, exactly two, and more than two Resources render without
      empty labels or legacy Skill content.
- [ ] Selecting a card continues to navigate to the correct own or read-only Profile.
- [ ] Member-list data loading avoids per-card Resource queries and preserves the existing
      alphabetical Member order.
- [ ] Rendered list/card tests verify visible content and navigation rather than internal query or
      component structure.

## Blocked by

- [Issue 001](./001-publish-and-discover-classified-resources.md)
- [Issue 003](./003-reorder-and-reclassify-resources-accessibly.md)

