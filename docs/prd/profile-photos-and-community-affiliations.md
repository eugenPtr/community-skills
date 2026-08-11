# Profile Photos, Community Affiliations, and Complete Profile Editing

## Problem Statement

Members cannot currently publish a recognizable Profile Photo or state which men's communities
they belong to. This makes the private network less personal and removes useful real-world context
from a Member's Profile. The Members page and individual Profiles also rely on names alone, which
makes people harder to recognize quickly.

After onboarding, Members can maintain only their Resources. They cannot correct their name,
location, Passions, Heart Project, Contact Details, or future Community Affiliations. A Member needs
one clear editing flow for all information they publish, with immediate validation that explains
why an incomplete Profile cannot be saved.

## Solution

Add an optional, Member-only Profile Photo backed by private Supabase Storage. Place photo selection
first in the existing **Despre tine** onboarding step, show a local preview, and display either the
photo or a no-cost initials placeholder beside the Member's name on Profile and Members cards.

Add an extensible catalog of Affiliated Communities and a many-to-many relationship between Profiles
and that catalog. Require every Member to select at least one Community Affiliation. Add the selection
to the bottom of the existing first onboarding step using checkboxes, seed the three approved
communities, and assign every existing Member to **Bărbați la Fain** during migration. Display all of
a Member's affiliations on Profile, but leave Members cards and People Search unchanged.

Replace the focused Resource maintenance entry point with one **Editează profilul** action. The action
opens a single-page editor containing every published Profile field, including Profile Photo,
Community Affiliations, Resources, and Contact Details. Validate the complete form on every change:
an invalid control receives a red border immediately and save stays disabled until the Profile is
valid. Warn before discarding unsaved changes, save through one coordinated operation, then return to
Profile with a confirmation toast.

## User Stories

1. As an invited participant, I want to add a Profile Photo, so that Members can recognize me.
2. As an invited participant without a suitable photo, I want photo selection to remain optional, so
   that it does not block me from joining.
3. As an invited participant, I want the photo control to be the first control in **Despre tine**, so
   that I establish my visual identity before entering personal details.
4. As an invited participant, I want to preview my selected photo, so that I know which image will be
   published.
5. As an invited participant, I want common JPEG, PNG, and WebP files accepted, so that I can use a
   normal phone or computer photo.
6. As an invited participant selecting a file larger than 5 MB, I want it rejected immediately, so
   that I understand the upload limit before final submission.
7. As an invited participant selecting an unsupported file, I want clear toast feedback, so that I
   can choose a valid image.
8. As an invited participant, I want my photo framed consistently without a crop editor, so that the
   interaction remains quick and simple.
9. As an invited participant whose selected photo fails to upload, I want onboarding to remain
   unfinished with retry or removal available, so that my choice is not silently ignored.
10. As an invited participant who refreshes onboarding, I accept reselecting my unsaved photo, so
    that the app does not need temporary upload persistence.
11. As an invited participant, I want to answer **Din ce comunitate faci parte?**, so that my Profile
    reflects my real-world community context.
12. As an invited participant, I want to select one or several Affiliated Communities, so that
    overlapping memberships are represented accurately.
13. As an invited participant, I want all available Affiliated Communities loaded from the approved
    catalog, so that the choices can grow without changing the Profile model.
14. As an invited participant, I want ManKind Project, Bărbați în Comuniune, and Bărbați la Fain shown
    with their canonical spelling, so that the organizations are represented correctly.
15. As an invited participant, I want the community question at the bottom of the existing first
    onboarding step, so that photo, identity, and affiliation stay together without adding a step.
16. As an invited participant, I want the next action disabled when no community is selected, so that
    I cannot publish an incomplete Profile.
17. As an existing Member, I want my Profile initially affiliated with Bărbați la Fain, so that the
    new requirement does not invalidate my existing Profile.
18. As a Member without a Profile Photo, I want a placeholder made from my initials, so that Profile
    and Members cards remain personal and visually balanced.
19. As a Member whose name changes, I want the initials placeholder to reflect the current name, so
    that no separate placeholder asset becomes stale.
20. As a Member browsing Members, I want a photo or initials beside each name, so that I can scan and
    recognize people quickly.
21. As a Member browsing a card, I want existing Resource and Heart Project information to remain
    below the photo-and-name row, so that the current discovery value is preserved.
22. As a Member opening a Profile, I want the photo or initials next to the name, so that identity is
    prominent.
23. As a Member opening a Profile, I want all Community Affiliations beneath the name and location,
    so that I can understand the Member's community context.
24. As a Member, I want Profile Photos visible only inside the authenticated network, so that they do
    not become public assets.
25. As a Member, I want one **Editează profilul** action on my own Profile, so that maintenance has an
    obvious entry point.
26. As a Member viewing someone else's Profile, I do not want editing controls, so that ownership is
    unambiguous.
27. As a Member editing my Profile, I want one page containing all editable information, so that I can
    review the complete published Profile at once.
28. As a Member, I want to edit my photo, name, location, Passions, Heart Project, Resources, Community
    Affiliations, and Contact Details, so that my Profile stays accurate.
29. As a Member, I want to change my Contact Email without changing my authentication email, so that
    public contact and account identity remain separate.
30. As a Member with an existing photo, I want to replace it, so that I can keep it current.
31. As a Member with an existing photo, I do not need a delete-photo action in this version, so that
    the editor stays simple.
32. As a Member editing a required text field, I want its border to turn red the moment its value
    becomes invalid, so that the disabled save action is immediately explained.
33. As a Member editing phone or Contact Email, I want validity checked on every character, so that I
    see immediately when the value no longer meets its format.
34. As a Member removing the last Community Affiliation, I want the checkbox group marked invalid
    immediately, so that I know at least one is required.
35. As a Member removing my last Resource, I want the Resource section marked invalid immediately, so
    that I know at least one is required.
36. As a Member with any invalid Profile value, I want save disabled, so that an incomplete Profile
    cannot be published.
37. As a Member correcting the final invalid value, I want save enabled immediately, so that the form
    responds predictably.
38. As a Member changing several fields, I want one save action, so that my published Profile changes
    coherently.
39. As a Member whose replacement photo fails to upload, I want my existing Profile and photo left
    intact, so that a storage failure cannot partially publish my changes.
40. As a Member whose save fails, I want an error toast and my edits preserved in the form, so that I
    can retry without re-entering everything.
41. As a Member leaving with unsaved changes, I want a warning before internal navigation, refresh,
    or tab closure, so that I do not lose work accidentally.
42. As a Member who saves successfully, I want to return to my Profile and see a confirmation toast,
    so that I can verify the published result.
43. As a keyboard user, I want every photo, checkbox, field, Resource control, and action reachable
    and operable without a pointer, so that editing is accessible.
44. As a screen-reader user, I want invalid controls exposed as invalid and grouped choices labelled,
    so that visual feedback is not the only signal.
45. As a mobile Member, I want onboarding, cards, Profile, and the complete editor to remain usable at
    a narrow viewport, so that photo and affiliation controls do not break the layout.
46. As an administrator in the future, I want Affiliated Communities represented as database rows,
    so that a later administration UI can add choices without changing the schema.

## Implementation Decisions

- Continue using the Supabase-centric stack. Create the Storage bucket, schema, seed data, policies,
  and backfill through Supabase CLI-managed migrations; make no manual Dashboard changes.
- Create a private Profile Photo bucket. Reading is allowed only to authenticated callers who are
  already Members, consistent with the existing Member-readable Profile boundary. Upload and
  replacement are restricted to the owning identity through a trusted server path and owner-scoped
  Storage policies.
- Store a nullable Profile Photo object path with the Profile. Do not store image bytes in Postgres
  or expose a permanent public URL.
- Accept JPEG, PNG, and WebP images up to 5 MB. Validate both declared type and actual file content at
  the trusted boundary; client validation exists for fast feedback but is not authoritative.
- Preserve the original upload. Render it in a square frame with centered cover behavior. Do not add
  client-side cropping or destructive image processing in this version.
- Generate a two-letter initials placeholder from current first and last names when no photo path is
  present. This placeholder is computed at render time and requires no stored asset or network call.
- Keep selected onboarding photos in client memory only. Do not include image data in the seven-day
  local draft and do not upload before final onboarding submission. A refresh may therefore clear
  only the selected photo while preserving the existing text draft.
- Treat a selected photo as part of the requested submission. An upload failure aborts onboarding or
  Profile save, produces toast feedback, and leaves retry and remove-selection choices available.
- Coordinate Storage and database writes defensively because they cannot share one transaction:
  validate and prepare required data first, upload to a new object path, commit database changes,
  remove the new object if the database commit fails, and remove a superseded old object only after a
  successful commit. Never overwrite the published object before the database succeeds.
- Do not expose deletion of an already-published Profile Photo. A Member may leave photo absent or
  replace an existing photo.
- Create an Affiliated Community catalog with stable identifier and unique canonical name. The
  catalog has no user-controlled position; presentation must not depend on insertion order.
- Seed exactly ManKind Project, Bărbați în Comuniune, and Bărbați la Fain in the catalog.
- Represent Profile affiliations through a many-to-many join with uniqueness per Profile/community
  pair and referential cleanup. Require at least one selected community at the authorized write
  boundary, not merely in the browser.
- Backfill every existing Profile with the Bărbați la Fain affiliation in the same rollout that makes
  Community Affiliation required.
- Make the Affiliated Community catalog Member-readable. Only trusted administrative paths may mutate
  it; building that administration path is deferred.
- Add Profile Photo and Community Affiliations to the Profile read model used by own and other-Member
  Profile pages. Add Profile Photo only to the Members-card read model.
- Do not add Community Affiliations to Members cards. On Profile, render compact wrapping labels
  beneath the name and location and show every selected affiliation.
- Do not include Community Affiliations in Profile-context embedding input, matching, filtering,
  answer context, or re-embedding triggers. People Search behavior remains unchanged. The reversible
  decision and future activation steps are recorded in the design-decision log.
- Keep onboarding at four steps. In **Despre tine**, order controls as Profile Photo first; existing
  first name, last name, and location next; Community Affiliation checkbox group last.
- Require at least one Community Affiliation before leaving the first onboarding step. Profile Photo
  remains optional. Preserve all existing onboarding requirements and subsequent step order.
- Replace the own-Profile focused Resource-edit entry point with one **Editează profilul** action that
  opens a single-page complete Profile editor. Reuse the existing Resource editor inside this page.
- Include all published Profile information in the editor: Profile Photo, first and last name,
  location, Community Affiliations, Passions, Heart Project state and description, Resources, Direct
  Contact Details, and Online Links.
- Do not edit the Supabase Auth email. Only Contact Email—the published display-only field—is part of
  the Profile editor.
- Preserve onboarding invariants during editing: required name and location; required Passions;
  valid Heart Project state and conditional description; at least one Resource; at least one
  Community Affiliation; and valid required phone and Contact Email. Preserve all existing Resource
  limits, uniqueness, classification, and indexing requirements.
- Validate the complete editor on every character or selection change, with no delayed touched-state
  exception. Mark each invalid text/input control with a red border immediately; mark invalid grouped
  controls as a group and expose invalidity accessibly. Disable save whenever any invariant fails and
  enable it immediately when the entire Profile is valid.
- Submit all Profile changes through one coordinated save. Keep database-owned Profile, Contact
  Details, Resource, and Community Affiliation changes transactional. Preserve synchronous Resource
  indexing requirements before Resources are published and retain the existing Profile-context
  re-embedding behavior for changes to Passions or Heart Project.
- Use toasts for transient upload, save, error, and success feedback. Do not introduce inline
  paragraph feedback; persistent invalidity is communicated by control/group styling and accessible
  validity state.
- Detect divergence from the initially loaded Profile. Warn before browser refresh/tab close and
  before in-app navigation while unsaved changes exist. Do not warn after a confirmed successful save.
- After success, redirect to the Member's own Profile and surface **Profilul a fost actualizat.** as a
  five-second toast, following the project's redirect-query feedback convention.
- Keep all owner checks and validation at trusted server/database boundaries. Another Member must not
  be able to mutate Profile data, affiliations, Resources, Contact Details, or Storage objects.
- Regenerate Supabase TypeScript types through the CLI after applying schema changes.

## Testing Decisions

- Test observable user behavior and domain outcomes rather than component state, private helpers,
  CSS implementation details, SQL statement order, or object-path formatting.
- Extend the existing rendered onboarding-form seam. Verify four steps remain, first-step ordering,
  optional photo selection and preview, supported-type/size rejection, required multi-select
  affiliations, disabled navigation, and photo loss without corruption of the seven-day text draft.
- Extend the onboarding service integration seam with injected persistence, embedding, and Storage
  collaborators. Verify valid affiliations and optional photo publication, missing/unknown community
  rejection, upload failure without Invite claim, database failure cleanup, and successful Invite,
  Profile, affiliation, and photo-path persistence.
- Add a rendered complete-Profile-editor seam. Verify all published fields load, Resources reuse the
  existing interaction surface, every field/group becomes invalid immediately, save enablement tracks
  whole-form validity, Contact Email is editable, auth email is absent, and photo replacement has
  preview/retry behavior but no published-photo delete action.
- Test the complete Profile save at its service boundary with injected Storage, embedding, and
  persistence collaborators. Verify ownership, database atomicity, upload-before-commit coordination,
  cleanup on commit failure, old-object cleanup only after success, preserved edits on failure, and
  redirect success behavior.
- Extend existing Profile-view tests for photo-versus-initials rendering, current-name initials,
  wrapping Community Affiliation labels, own-only edit action, and absence of editing controls for
  another Member.
- Extend existing Member-card tests for the photo-or-initials and name row while proving current
  Resource previews, Heart Project content, links, and lack of Community Affiliation labels remain
  unchanged.
- Extend the local database adapter and migration tests for seeded canonical communities, unique
  names, many-to-many uniqueness, valid references, cascade behavior, at-least-one enforcement at the
  write boundary, existing-Member backfill, and nullable Profile Photo path.
- Run Storage and RLS integration tests against the local Supabase stack. Prove unauthenticated and
  authenticated non-Member reads fail, Members can read Profile Photos, owners can publish/replace
  through the authorized path, and one Member cannot mutate another Member's object or Profile data.
- Extend Profile read-model tests to prove affiliations and photo path are returned without changing
  People Search evidence. Add a regression test that Profile-context embedding input excludes
  Community Affiliations and affiliation-only edits do not request re-embedding.
- Test unsaved-change protection through rendered navigation behavior and browser-level refresh/close
  registration. Verify clean forms do not warn and successful save clears the warning before redirect.
- Manually exercise onboarding, Members cards, own Profile, another Member's Profile, and complete
  editing in a real browser at desktop and mobile viewport sizes. Verify valid, invalid, upload-failure,
  save-failure, keyboard, responsive wrapping, placeholder, replacement, warning, toast, and redirect
  states before handoff.

## Out of Scope

- An administration UI for creating, renaming, deleting, activating, deactivating, or ordering
  Affiliated Communities.
- A `position` or other user-controlled display-order field for Affiliated Communities.
- Community Affiliation labels on Members cards.
- Community Affiliation retrieval, filtering, embedding, ranking, evidence, or answers in People
  Search, and the associated full re-embedding backfill.
- Profile Photos in People Search results or answer content.
- Public or unauthenticated Profile Photo access.
- A manual crop, rotate, zoom, filter, or image-editing interface.
- Persisting an unsubmitted onboarding photo across refreshes or devices.
- Removing an already-published Profile Photo and returning to the initials placeholder.
- Editing authentication email, authentication identity, Invite state, Admin status, or other account
  settings from the complete Profile editor.
- Inline editing directly on read-only Profile or Members cards.
- A separate focused Resource editor after the complete Profile editor replaces its entry point.
- Changes to current People Search models, prompts, retrieval thresholds, or evidence merging.

## Further Notes

- Use the glossary terms Member, Profile, Profile Photo, Affiliated Community, Community Affiliation,
  Contact Email, Contact Details, Resource, Passions, Heart Project, Members, and People Search.
- The existing glossary defines Profile Photo visibility and replacement behavior and defines the
  distinction between the network-wide Community and an Affiliated Community.
- ADR-0003 keeps files and relational data in the Supabase-centric stack. ADR-0006 requires the same
  Member-readable privacy boundary for the new Profile read data and private photo objects.
- ADR-0010 remains unchanged: only Resources and Profile context participate in People Search.
- The lightweight design-decision log records both immediate edit validation and the deliberate
  exclusion of Community Affiliations from People Search, including the future re-embedding work.
- Supabase documents Profile Photos as a common public-bucket use case, but this product deliberately
  uses a private bucket because the entire Profile is Member-only.
- Upgrade the installed Vercel CLI before implementation (`npm i -g vercel@latest` or
  `pnpm add -g vercel@latest`); the installed 54.14.5 is behind 58.9.1.

