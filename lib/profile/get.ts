import type { SupabaseClient } from "@supabase/supabase-js";

// The Social Links a Profile can publish, in display order. The same order the
// Profile page renders them in; a link absent from the map was never published
// and is omitted entirely (issue #17), never shown as an empty row.
export const SOCIAL_KEYS = [
  "phone",
  "email",
  "website",
  "linkedin",
  "facebook",
  "instagram",
  "x",
] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];

export interface MemberProfile {
  id: string;
  name: string;
  location: string;
  skills: string;
  passions: string;
  heartProjectDescription: string | null;
  heartProjectSeeking: boolean;
  // Only the Social Links the Member actually set. Absent key = not published.
  socials: Partial<Record<SocialKey, string>>;
}

interface ProfileRow {
  id: string;
  name: string;
  location: string;
  skills: string;
  passions: string;
  heartProjectDescription: string | null;
  heartProjectSeeking: boolean;
}

export interface GetProfileClient {
  fetchProfile(memberId: string): PromiseLike<{
    data: ProfileRow | null;
    error: { message: string } | null;
  }>;
  fetchSocials(memberId: string): PromiseLike<{
    data: Record<SocialKey, string | null> | null;
    error: { message: string } | null;
  }>;
}

// A Member's full published Profile, or null when no Member has that id (a
// broken or stale link). Only the Social Links that are set come back, so the
// page never has to decide what "empty" means.
export async function getProfile(
  client: GetProfileClient,
  memberId: string,
): Promise<MemberProfile | null> {
  const { data: profile, error } = await client.fetchProfile(memberId);
  if (error) throw new Error(`getProfile failed: ${error.message}`);
  if (!profile) return null;

  const { data: socialsRow, error: socialsError } =
    await client.fetchSocials(memberId);
  if (socialsError) {
    throw new Error(`getProfile socials failed: ${socialsError.message}`);
  }

  const socials: Partial<Record<SocialKey, string>> = {};
  if (socialsRow) {
    for (const key of SOCIAL_KEYS) {
      const value = socialsRow[key];
      if (value && value.trim()) socials[key] = value;
    }
  }

  return { ...profile, socials };
}

// Production adapter over the cookie-bound server client (ADR-0006 RLS).
export function supabaseGetProfileClient(
  supabase: SupabaseClient,
): GetProfileClient {
  return {
    async fetchProfile(memberId) {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "member_id, name, location, skills, passions, heart_project_description, heart_project_seeking",
        )
        .eq("member_id", memberId)
        .maybeSingle();
      return {
        data: data
          ? {
              id: data.member_id,
              name: data.name,
              location: data.location,
              skills: data.skills,
              passions: data.passions,
              heartProjectDescription: data.heart_project_description,
              heartProjectSeeking: data.heart_project_seeking,
            }
          : null,
        error: error ? { message: error.message } : null,
      };
    },
    async fetchSocials(memberId) {
      const { data, error } = await supabase
        .from("socials")
        .select("phone, email, website, linkedin, facebook, instagram, x")
        .eq("member_id", memberId)
        .maybeSingle();
      return {
        data: data ?? null,
        error: error ? { message: error.message } : null,
      };
    },
  };
}
