# Design Decisions

Lightweight, reversible product and design decisions that should remain visible but do not warrant
an Architecture Decision Record.

## 2026-08-11 — Community Affiliations do not influence People Search

**Status:** Current

Community Affiliations are displayed on a Member's Profile but are not included in People Search
embeddings, matching, filtering, or answers. People Search keeps its current behavior.

This can be added later without changing the Community Affiliation data model. Doing so will require
adding affiliations to the profile embedding input, triggering re-embedding when affiliations change,
and backfilling embeddings for existing Members.

## 2026-08-11 — Profile editing uses immediate validity feedback

**Status:** Current

The complete Profile editor validates on every input change. A required or otherwise invalid field
receives a red border immediately, and the save button remains disabled whenever any Profile rule is
unsatisfied. The button becomes enabled again as soon as the entire Profile is valid.
