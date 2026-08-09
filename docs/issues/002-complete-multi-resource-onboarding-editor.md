# Complete the multi-Resource onboarding editor

## Type

AFK

## What to build

Turn the basic Resource input into the approved four-step onboarding experience and reusable
multi-Resource editor. Support efficient keyboard and touch entry, inline correction, safe removal,
duplicate and length validation, category capacity, and draft restoration while making it explicit
that one Resource of either kind satisfies onboarding.

Covers user stories 6–18 and 25–31 from the Resources PRD.

## Acceptance criteria

- [ ] Onboarding has four steps in this order: Despre tine; Pasiuni și Proiect de Suflet; Resurse;
      Contact.
- [ ] The Resources step uses the approved heading, explanation, examples, per-entry guidance, and
      input placeholder from the PRD.
- [ ] **Resurse gratis** and **Resurse contra cost** remain visible when empty, with **Adaugă
      resursă** below and outside each bordered container.
- [ ] The automatic neutral checklist item checks only when at least one Resource exists; **Înainte**
      is disabled while unchecked, and no completion text or validation toast appears.
- [ ] Clicking **Adaugă resursă** shows an auto-growing single-paragraph input with a live `0/255`
      counter; Enter adds, Escape or the adjacent × cancels, blur preserves the draft, and whitespace
      alone cannot submit.
- [ ] Resource rows occupy one full-width wrapped row and show the complete description. Free rows
      have green borders and paid rows blue borders, with section headings carrying the accessible
      classification meaning.
- [ ] Selecting row text edits inline; Enter saves locally, Escape cancels, and the 255-character
      limit remains visible and enforced.
- [ ] Case-insensitive duplicates are rejected across both categories after trimming. The text and
      focus remain in the input with **Această resursă a fost deja adăugată.** shown inline.
- [ ] Pressing × removes locally and immediately; a five-second undo toast restores the former
      category and position.
- [ ] At 10 Resources in a category, its add control remains visible as disabled **Limită atinsă ·
      10/10**.
- [ ] The versioned expiring onboarding draft restores both Resource lists and active onboarding
      progress while safely ignoring incompatible legacy Skill drafts.
- [ ] Rendered interaction tests verify the complete keyboard/touch-visible behavior without
      asserting component state or styling implementation details.

## Blocked by

- [Issue 001](./001-publish-and-discover-classified-resources.md)

