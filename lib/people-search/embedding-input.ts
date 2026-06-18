// The one source of truth for what text becomes a Member's embedding (issue
// #23, ADR-0008): a labeled concatenation of Skills + Heart Project + Passions.
//
// Why these three and not the name/location: names carry no skill signal and
// would add noise; location is a future structured filter, not a vector. The
// combined text is what lets People Search answer Skill, Passion ("who is into
// travelling") and Heart Project questions from one index.
//
// Reused by every embed write path (onboarding save, profile edit, seed,
// backfill) through embedMember, so a query and a stored profile are always
// embedded from the same shape.

export interface EmbeddingProfile {
  skills: string;
  passions: string;
  heartProjectDescription: string | null;
  heartProjectSeeking: boolean;
}

export function buildEmbeddingInput(profile: EmbeddingProfile): string {
  const heartProject = profile.heartProjectSeeking
    ? "Still seeking a heart project."
    : (profile.heartProjectDescription?.trim() ?? "");

  return [
    `Skills: ${profile.skills.trim()}`,
    `Heart project: ${heartProject}`,
    `Passions: ${profile.passions.trim()}`,
  ].join("\n");
}
