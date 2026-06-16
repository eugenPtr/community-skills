import { claimInvite, type InviteRpcClient } from "@/lib/invites/claim";

export type SubmitOnboardingResult =
  | { kind: "ok" }
  | { kind: "alreadyClaimed" }
  | { kind: "invalidCode" }
  | { kind: "missingFields" };

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
}

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

  return { kind: "ok" };
}
