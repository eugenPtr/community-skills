import { claimInvite, type InviteRpcClient } from "@/lib/invites/claim";

export type SubmitOnboardingResult =
  | { kind: "ok" }
  | { kind: "alreadyClaimed" }
  | { kind: "invalidCode" }
  | { kind: "missingFields" };

export interface SocialsInput {
  phone?: string;
  email?: string;
  website?: string;
  linkedin?: string;
  facebook?: string;
  instagram?: string;
  x?: string;
}

export interface OnboardingDbClient extends InviteRpcClient {
  insertProfile(data: {
    memberId: string;
    name: string;
    location: string;
    skills: string;
    passions: string;
    heartProjectDescription: string | null;
    heartProjectSeeking: boolean;
  }): PromiseLike<{ error: { message: string } | null }>;
  upsertSocials(data: {
    memberId: string;
    phone: string | null;
    email: string | null;
    website: string | null;
    linkedin: string | null;
    facebook: string | null;
    instagram: string | null;
    x: string | null;
  }): PromiseLike<{ error: { message: string } | null }>;
}

const SOCIALS_FIELDS = [
  "phone",
  "email",
  "website",
  "linkedin",
  "facebook",
  "instagram",
  "x",
] as const;

export async function submitOnboarding(
  client: OnboardingDbClient,
  opts: {
    userId: string;
    email: string;
    code: string;
    name: string;
    location: string;
    skills: string;
    passions: string;
    heartProjectSeeking: boolean;
    heartProjectDescription?: string;
    socials?: SocialsInput;
  },
): Promise<SubmitOnboardingResult> {
  if (
    !opts.name.trim() ||
    !opts.location.trim() ||
    !opts.skills.trim() ||
    !opts.passions.trim() ||
    (!opts.heartProjectSeeking && !opts.heartProjectDescription?.trim())
  ) {
    return { kind: "missingFields" };
  }

  const claim = await claimInvite(client, {
    code: opts.code,
    userId: opts.userId,
    email: opts.email,
  });

  if (claim.kind === "invalid") return { kind: "invalidCode" };
  if (claim.kind === "alreadyClaimed") return { kind: "alreadyClaimed" };

  const { error } = await client.insertProfile({
    memberId: opts.userId,
    name: opts.name,
    location: opts.location,
    skills: opts.skills,
    passions: opts.passions,
    heartProjectDescription: opts.heartProjectDescription ?? null,
    heartProjectSeeking: opts.heartProjectSeeking,
  });

  if (error) throw new Error(`insertProfile failed: ${error.message}`);

  const socials = Object.fromEntries(
    SOCIALS_FIELDS.map((f) => [f, opts.socials?.[f]?.trim() || null]),
  ) as Record<(typeof SOCIALS_FIELDS)[number], string | null>;

  if (Object.values(socials).some((v) => v !== null)) {
    const { error: socialsError } = await client.upsertSocials({
      memberId: opts.userId,
      ...socials,
    });
    if (socialsError) {
      throw new Error(`upsertSocials failed: ${socialsError.message}`);
    }
  }

  return { kind: "ok" };
}
