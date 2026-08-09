# Resources

## Problem Statement

Members currently describe Skills in one undifferentiated free-text field. That model does not tell
the Community what a Member is concretely offering, whether the offer is free or paid, or which
offer matched a need in People Search. It also makes individual offers difficult to add, remove,
order, display, and search accurately.

Members need a sleek way to publish concrete material things or services as Resources, distinguish
free offers from paid offers, maintain those offers over time, and make the nature of every search
match clear to other Members.

## Solution

Replace Skill with Resource throughout the product and data model. A Resource is an individual
material thing or service offered by a Member and classified as either free or paid. Free means the
offering Member charges no fee for the Resource itself; the network does not represent prices or any
other terms. A Member publishes at least one Resource and may publish up to 10 free and 10 paid
Resources, with each single-paragraph description limited to 255 characters.

Give Resources their own onboarding step after Passions and Heart Project. Present separate
**Resurse gratis** and **Resurse contra cost** editors, each with wrapped, full-width rows and an
external **Adaugă resursă** control. Support inline editing, removal with undo, drag-and-drop
classification and ordering, and accessible non-drag alternatives. Add a focused Resource editor
for later maintenance, while deferring a general Profile editor.

Show ordered Resources on Profiles and compact previews on Member cards. Replace combined
Member-only semantic retrieval with separate Resource and Profile-context indexes. People Search
will search both, merge evidence per Member, distinguish explicit offers from interests, and apply
hard free/paid filtering when conversational intent asks for it.

## User Stories

1. As an invited participant, I want Resources explained as material things or services, so that I
   understand what belongs in the field.
2. As an invited participant, I want Resources separated from Passions and Heart Project, so that
   onboarding remains focused and easy to scan.
3. As an invited participant, I want the Resources step after Passions and Heart Project, so that I
   first describe myself and then state what I can concretely offer.
4. As an invited participant, I want separate free and paid sections, so that I can classify each
   offer unambiguously.
5. As an invited participant, I want both sections visible even when empty, so that the two possible
   classifications remain clear.
6. As an invited participant, I want examples of distinct Resources, so that I do not combine several
   offers into one entry.
7. As an invited participant, I want to add a Resource by pressing Enter, so that repeated entry is
   fast.
8. As a touch user, I want a visible cancel control beside the add input, so that I do not depend on
   the Escape key.
9. As a Member, I want each Resource to support up to 255 characters, so that I can describe a
   concrete offer precisely.
10. As a Member, I want a live character counter, so that I can stay within the description limit.
11. As a Member, I want Resource descriptions to wrap and remain fully visible, so that important
   terms are not hidden by truncation.
12. As a Member, I want each Resource to be a single paragraph, so that Enter has predictable add
   and save behavior.
13. As a Member, I want exact duplicates rejected across both classifications, so that my Profile
   does not show redundant offers.
14. As a Member correcting a duplicate, I want my text preserved with an inline error, so that I can
   fix it without retyping.
15. As a Member, I want to edit a Resource inline by selecting its text, so that small corrections
   are easy.
16. As a keyboard user, I want Enter to save an inline edit and Escape to cancel it, so that editing
   is efficient and accessible.
17. As a Member, I want to remove a Resource immediately with ×, so that list maintenance feels
   direct.
18. As a Member who removed a Resource accidentally, I want a five-second undo toast, so that I can
   restore it to its prior category and position.
19. As a Member, I want to drag a Resource between sections, so that changing free versus paid feels
   natural.
20. As a mobile user, I want dragging to start only from a dedicated handle, so that scrolling and
   text selection remain reliable.
21. As a keyboard or assistive-technology user, I want a menu action to move a Resource between
   categories, so that classification never depends on dragging.
22. As a Member, I want to reorder Resources inside each category, so that my most important offers
   appear first.
23. As a Member, I want my chosen order preserved, so that Profile and search presentation reflect
   my priorities.
24. As a Member, I want free Resources shown before paid Resources, so that community contributions
   remain prominent.
25. As a Member, I want to publish only free or only paid Resources if that reflects my offer, so
   that onboarding does not force filler content.
26. As an invited participant, I want an automatic requirement indicator, so that it is clear that
   one Resource of either kind is sufficient.
27. As an invited participant, I want the requirement indicator to remain neutral until satisfied,
   so that an untouched form does not look erroneous.
28. As an invited participant, I want the next-step button disabled until one Resource exists, so
   that I cannot submit an incomplete Profile.
29. As a Member, I want no more than 10 Resources in either category, so that Profiles remain focused.
30. As a Member at a category limit, I want the add control to say **Limită atinsă · 10/10**, so that
   its disabled state is understandable.
31. As a Member dragging into a full category, I want the Resource to remain in place and receive an
   explanatory toast, so that no data is lost.
32. As a Member, I want a focused Resource editor after onboarding, so that my current availability
   does not become stale.
33. As a Member editing Resources, I want one explicit atomic save, so that a series of changes is
   committed consistently.
34. As a Member with no Resource temporarily left in the editor, I want saving disabled rather than
   removal blocked, so that replacing my last Resource is straightforward.
35. As a Member with unsaved changes, I want a warning before navigating away, so that I do not lose
   work accidentally.
36. As a Member who saved successfully, I want to return to my Profile and see a confirmation toast,
   so that I can verify the published result.
37. As a Member viewing a Profile, I want free and paid Resources shown in separate read-only sections,
   so that their classifications are obvious without relying on border color.
38. As a Member viewing a Profile, I want empty Resource categories hidden, so that the page contains
   no meaningless empty panels.
39. As a Member browsing the Members page, I want up to two Resource previews with explicit free or
   paid prefixes, so that I can evaluate a Member without opening every Profile.
40. As a Member browsing a card with more Resources, I want to see **+ încă N**, so that I know more
   offers are available.
41. As a Member searching for help, I want explicit Resource providers ranked ahead of Members who
   are merely interested in the topic, so that actionable matches appear first.
42. As a Member exploring a topic, I want both providers and interested Members returned, so that I
   can discover the full relevant Community.
43. As a Member reading a search answer, I want the reason to distinguish a free offer, paid offer,
   Passion, or Heart Project, so that interest is never misrepresented as availability.
44. As a Member matching through several signals, I want to appear once with combined evidence, so
   that results are not repetitive.
45. As a Member asking explicitly for free help, I want only matching free Resources returned, so
   that paid and interest-only results do not contradict my constraint.
46. As a Member asking explicitly for paid help, I want only matching paid Resources returned, so
   that the result respects my intent.
47. As a Member using natural Romanian phrasing for cost intent, I want the conversational interface
   to understand me without separate filter controls.
48. As a Member editing one Resource, I want only changed Resource content re-embedded, so that search
   indexing remains precise and efficient.
49. As a Member, I want Resource publication to fail cleanly if synchronous indexing is unavailable,
   so that visible and searchable Profile state cannot disagree.
50. As a Member blocked by exhausted AI credits, I want a specific explanation, so that I understand
   why saving or searching cannot continue.
51. As a Member blocked by another AI outage, I want a provider-neutral availability message, so that
   internal provider details are not presented as product concepts.
52. As a desktop user, I want AI availability messages in an accessible modal with multiple close
   affordances, so that I can dismiss them easily.
53. As a mobile user, I want the same message in a content-sized bottom sheet capped at two-thirds of
   the viewport, so that it is readable without wasting the screen.
54. As a Community member, I want future donation prompts to explain that contributions support
   operating and AI-credit costs, so that I can choose to help sustain the network.

## Implementation Decisions

- Replace the Skill domain term, UI copy, persistence, seed representation, Profile presentation,
  Member-card presentation, and search evidence with Resource.
- Discard legacy Skill values. No production-data conversion or transitional unclassified state is
  required.
- Store Resources in a separate relational collection owned by a Member rather than renaming the
  existing Profile text field or storing a JSON blob.
- Each Resource has a stable identifier, Member ownership, a single-paragraph description, a
  `free` or `paid` classification, and an ordered position within its classification.
- Enforce a 255-character description maximum, at least one Resource per Member, at most 10 free and
  10 paid Resources, valid classifications, stable unique positions, and Member ownership at the
  server/database boundary.
- Normalize descriptions by trimming surrounding whitespace. Reject duplicates across both
  categories case-insensitively after normalization.
- Apply Member-readable RLS consistent with Profile visibility. Only the owning Member may mutate
  Resources through the authorized server path.
- Update onboarding from three to four steps in this order: Despre tine; Pasiuni și Proiect de
  Suflet; Resurse; Contact.
- Use the approved Resources-step heading and explanation: **Ce resurse poți oferi comunității?**
  and **O resursă poate fi un lucru material sau un serviciu pe care îl pui la dispoziția
  celorlalți. Adaugă cel puțin o resursă și separă ce oferi gratis de ce oferi contra cost.**
- Show the automatic checklist item **Adaugă cel puțin o resursă, gratis sau contra cost.** It is
  neutral and non-interactive. The next/save action is disabled while it is unchecked. Do not show a
  success message when it becomes checked.
- Use the helper examples **Exemple: mentorat, coaching sau o consultație de dezvoltare software de
  o oră.** for free Resources and **Exemple: servicii de dezvoltare pentru aplicații mobile sau
  servicii de design interior.** for paid Resources. Add **Adaugă fiecare resursă separat.** and use
  **Descrie resursa…** as the input placeholder.
- Render two always-visible editor sections titled **Resurse gratis** and **Resurse contra cost**.
  Place **Adaugă resursă** below and outside each bordered container.
- Clicking the add control replaces it with an auto-growing, visually wrapped input and live
  character counter. Enter adds, Escape or the visible adjacent × cancels, clicking elsewhere
  preserves the draft, and whitespace-only content cannot be submitted.
- Render every persisted Resource as one full-width, pill-styled row that wraps and shows its full
  description. Free rows use a green border and paid rows a blue border; section headings, not color
  alone, convey classification.
- Clicking/tapping Resource text enters inline edit mode. Enter saves the local edit, Escape cancels,
  and duplicate validation appears inline while preserving focus and text.
- Put a dedicated drag handle on the left. Keep remove and overflow actions fixed at the top-right.
  Dragging within a section reorders; dragging between sections changes classification. The overflow
  menu exposes **Mută la gratis** or **Mută la contra cost** as the accessible fallback.
- At 10 entries in a category, keep a disabled **Limită atinsă · 10/10** control visible. Reject an
  attempted move into that category with a toast and preserve the original classification/order.
- Remove locally and immediately via ×. Show a five-second undo toast that restores the former
  classification and position.
- Preserve Resource arrays in the existing expiring onboarding draft. Bump/version the draft shape
  so incompatible Skill drafts are ignored safely.
- Add a focused Resource editor reachable from the Member's own Profile. Reuse the same editor UI;
  defer the general Profile editor.
- Save the complete Resource set atomically. Generate all required new/changed Resource embeddings
  synchronously and do not publish database changes if indexing fails. Classification/order-only
  changes do not require new embeddings because classification is structured metadata.
- Warn before browser or in-app navigation when the focused editor has unsaved changes. After a
  successful save, return to the own Profile and show **Resursele au fost actualizate.** as a toast.
- On read-only Profiles, show free Resources first and paid Resources second, preserve chosen order,
  and hide empty categories. Read-only rows have no drag/edit/remove controls.
- On Member cards, show at most the first two Resources in free-first order, prefix each with
  **Gratis:** or **Contra cost:**, and show **+ încă N** for the remainder.
- Seed individual Resources rather than Skill text. Cover only-free, only-paid, mixed, near-limit,
  ordering, and no-duplicate scenarios.
- Follow ADR-0010: embed each Resource independently from its description and maintain a separate
  Member Profile-context embedding for Passions and Heart Project. Do not repeat whole Profile
  context in each Resource embedding.
- Embed a query once, search Resource and Profile-context indexes separately, and merge evidence by
  Member. A Member appears once and may carry multiple evidence signals.
- For unconstrained queries, retrieve both Resource providers and interest-only Profile matches.
  For help-seeking language, rank explicit Resource evidence ahead of interest-only evidence without
  excluding the latter.
- Run a lightweight structured conversational-intent step before retrieval to derive `any`, `free`,
  or `paid`. An explicit `free` or `paid` result filters Resource retrieval strictly and excludes
  Profile-context-only matches.
- Pass evidence type and exact matched content to answer generation. The answer must state whether a
  Member offers a free or paid Resource or is only interested through a Passion/Heart Project; it
  must never infer an offer from interest.
- Continue routing embeddings, intent classification, and answers through Vercel AI Gateway using
  the project-approved models and credential. Do not wire providers directly.
- Treat AI Gateway HTTP `402` as exhausted credits. Saving remains unchanged/unsaved when embedding
  returns this error. People Search returns no fabricated answer.
- Show these provider-neutral Romanian credit messages:
  - Save: **Soldul de credite AI este insuficient. Modificările nu au fost salvate. Ia în
    considerare o donație și contactează echipa tehnică pentru realimentare.**
  - Search: **Soldul de credite AI este insuficient. Căutarea nu poate fi efectuată momentan. Ia în
    considerare o donație și contactează echipa tehnică pentru realimentare.**
- For other Gateway availability failures, show **Serviciul AI nu este disponibil momentan. Încearcă
  din nou mai târziu.** Rate limits remain distinct from exhausted credits.
- Present AI-credit and AI-availability failures in a reusable accessible dialog. Desktop uses a
  centered modal; mobile uses a content-sized bottom sheet with a two-thirds-viewport maximum
  height. Provide top-right × and bottom **Închide** controls, backdrop dismissal, Escape dismissal,
  focus trapping, and focus restoration.
- Keep the AI failure dialog informational for now; do not add an unowned support or donation action.
- Follow ADR-0011 by keeping future donation encouragement voluntary. Donation is not a condition of
  membership or feature access.

## Testing Decisions

- Test external behavior and domain outcomes, not component state, CSS class names, SQL structure,
  or private helper calls. Prefer the highest existing seam that can prove each behavior.
- Extend rendered onboarding-form tests to cover the four-step order, approved copy, automatic
  requirement status, disabled navigation, draft restoration, add/edit/cancel/remove/undo behavior,
  duplicate handling, 255-character counting, category limits, and keyboard interactions.
- Test the shared Resource editor as one rendered interaction surface reused by onboarding and the
  focused editor. Exercise pointer-equivalent drag outcomes through the public interaction seam and
  separately verify the keyboard/overflow move fallback.
- Add rendered Profile and Member-list tests for free-first ordering, hidden empty read-only sections,
  complete wrapped descriptions, two-item card previews, explicit classification prefixes, and the
  remainder count.
- Extend onboarding service tests through the existing injected database seam. Verify at-least-one,
  per-category limits, duplicate normalization, atomic failure, Invite behavior, and successful
  persistence without asserting query order or helper implementation.
- Add focused Resource-save service tests through an injected persistence/indexing seam. Verify that
  unchanged descriptions do not require re-embedding, changed/new descriptions do, classification
  and order changes persist atomically, and any synchronous embedding failure leaves the published
  set unchanged.
- Extend the local PGlite database test adapter and migration tests to prove Resource constraints,
  stable ordering, ownership, cascade behavior, and database-enforced category limits.
- Extend local RLS tests to prove all Members can read Resources while non-owners cannot insert,
  update, delete, or reorder another Member's Resources.
- Replace the current combined embedding-input tests with separate Resource-input and
  Profile-context-input tests. Verify exact stable input composition without making network calls.
- Extend People Search orchestration tests using injected fake intent classifier, embedder, database,
  and generator seams. Verify one query embedding, two retrieval paths, one merged candidate per
  Member, multiple evidence types, provider-first ranking for help queries, and strict free/paid
  filtering.
- Test generation context and hard prompt behavior: answers may describe Passion/Heart Project as
  interest but cannot call it an offer; free and paid Resource evidence must be labeled accurately.
- Add failure-path tests for credit exhaustion versus other Gateway errors. Verify the correct modal
  copy, no partial Resource save, no fabricated search response, all close mechanisms, focus trap,
  focus restoration, and mobile bottom-sheet semantics.
- Run database integration tests against the local Supabase stack in addition to PGlite where
  pgvector functions, indexes, migrations, and RLS behavior require real Postgres fidelity.
- Update seed tests to require valid individual Resource variants, category limits, ordered positions,
  and generated Resource/Profile-context embeddings.

## Out of Scope

- A general Profile editor for name, location, Passions, Heart Project, or Contact Details.
- Structured price, currency, rate, unit, quote, booking, payment, negotiation, availability, or
  commercial-term fields.
- Transactions, marketplace behavior, or enforcing any agreement between Members.
- More than 10 free or 10 paid Resources per Member.
- Migrating or classifying legacy Skill text; it is intentionally discarded.
- An unclassified or transitional Resource category.
- A visible People Search cost filter; intent remains conversational.
- Excluding all interest-only matches from unconstrained or general help-seeking queries.
- Asynchronous embedding, pending-index states, background retries, or allowing saves while indexing
  is unavailable.
- A donation page, payment integration, support destination, donation amount, campaign placement, or
  contribution flow. Those require a separate product decision.
- Making donations mandatory or gating membership/features by donation status.
- Editing Resources directly from read-only Member cards or another Member's Profile.

## Further Notes

- Domain vocabulary and the free/paid boundary are defined in the project glossary. Use Resource,
  Free Resource, and Paid Resource; avoid reintroducing Skill in product language.
- ADR-0010 governs dual-index Resource/Profile-context retrieval and conversational cost intent.
- ADR-0011 governs voluntary donation encouragement.
- Existing People Search similarity thresholds and final candidate limits remain tuning parameters;
  validate them with representative Romanian Resource, Passion, and Heart Project content rather
  than treating current constants as permanent product requirements.
- The latest available Vercel CLI should be used before implementation because the installed CLI is
  outdated and AI Gateway behavior evolves quickly.
