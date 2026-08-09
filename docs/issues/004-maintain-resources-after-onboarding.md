# Maintain Resources after onboarding

## Type

AFK

## What to build

Add a focused Resource editor reachable from the Member's own Profile, reusing the onboarding
editor without introducing a general Profile editor. Save the complete edited Resource set as one
atomic, synchronously indexed change and protect Members from losing an unsaved editing session.

Covers user stories 32–36 from the Resources PRD.

## Acceptance criteria

- [ ] The own Profile exposes a clear **Editează resursele** action; another Member's Profile does
      not expose Resource mutation controls.
- [ ] The focused screen uses the same add, inline edit, remove/undo, reorder, reclassify, duplicate,
      length, and category-limit behavior as onboarding.
- [ ] Removing the last Resource is allowed as a temporary local state, but the shared checklist
      unchecks and **Salvează modificările** remains disabled until at least one Resource exists.
- [ ] One explicit save validates and persists the complete set atomically with stable Resource
      identities and positions.
- [ ] New and description-changed Resources are embedded synchronously; classification/order-only
      changes reuse the existing vector. Any required embedding failure leaves the published set
      unchanged.
- [ ] Back navigation, links, close/refresh, and browser navigation warn before discarding dirty
      edits and do not warn after save or when nothing changed.
- [ ] Successful save returns to the own Profile and shows **Resursele au fost actualizate.** through
      the established redirect-toast behavior.
- [ ] Service tests prove atomic success/failure through injected persistence and embedding seams;
      rendered tests prove ownership-visible navigation and unsaved-change behavior.

## Blocked by

- [Issue 002](./002-complete-multi-resource-onboarding-editor.md)
- [Issue 003](./003-reorder-and-reclassify-resources-accessibly.md)

