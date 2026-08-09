# Reorder and reclassify Resources accessibly

## Type

AFK

## What to build

Allow Members to prioritize Resources and change their classification without deleting and
recreating them. Provide pointer drag-and-drop optimized for mobile scrolling and an equivalent
keyboard/assistive-technology action, then persist and display the chosen category order.

Covers user stories 19–24 and 31 from the Resources PRD.

## Acceptance criteria

- [ ] Every editable Resource row has a dedicated left-side drag handle; dragging cannot begin from
      the description or action controls.
- [ ] Dragging within a category changes and visually previews the Resource order.
- [ ] Dragging between containers changes the Resource classification and inserts it at the selected
      position.
- [ ] An overflow action exposes **Mută la gratis** or **Mută la contra cost** and produces the same
      result without drag-and-drop.
- [ ] The interaction remains usable with wrapped 255-character rows, touch scrolling, keyboard
      navigation, and screen-reader labels.
- [ ] Moving into a category already containing 10 Resources is rejected, leaves the Resource at its
      original category and position, and shows an explanatory toast.
- [ ] Persisted ordering is stable across reloads and drives free-first ordering on read-only
      Profiles.
- [ ] Tests exercise reorder and reclassification through public editor interactions and verify the
      accessible fallback independently of the drag library's internals.

## Blocked by

- [Issue 002](./002-complete-multi-resource-onboarding-editor.md)

