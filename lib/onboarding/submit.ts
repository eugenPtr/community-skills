import { isPossiblePhoneNumber, parsePhoneNumber } from "libphonenumber-js/max";
import type { Embedder } from "@/lib/people-search/embed-member";
import { buildProfileContextEmbeddingInput } from "@/lib/people-search/embedding-input";
import { normalizeResources, type ResourceInput } from "@/lib/resources/model";

export type SubmitOnboardingResult =
  | { kind: "ok" }
  | { kind: "alreadyClaimed" }
  | { kind: "invalidCode" }
  | { kind: "missingFields" };

export interface SocialsInput {
  phone?: string; email?: string; website?: string; linkedin?: string;
  facebook?: string; instagram?: string; x?: string;
}

interface OnboardingPayload {
  userId: string; email: string; code: string; firstName: string; lastName: string;
  location: string; passions: string; heartProjectSeeking: boolean;
  heartProjectDescription?: string; resources: ResourceInput[]; socials?: SocialsInput;
  communityIds?: string[]; profilePhotoPath?: string;
}

export interface OnboardingDbClient {
  completeOnboarding(data: Omit<OnboardingPayload, "resources" | "socials"> & {
    resources: Array<ResourceInput & { position: number; embedding: number[] }>;
    profileContextEmbedding: number[];
    profileContextEmbeddingInput: string;
    socials: Record<string, string | null>;
  }): PromiseLike<{ error: { code?: string; message: string } | null }>;
}

const SOCIAL_FIELDS = ["phone", "email", "website", "linkedin", "facebook", "instagram", "x"] as const;

export async function submitOnboarding(
  deps: { db: OnboardingDbClient; embedder: Embedder },
  opts: OnboardingPayload,
): Promise<SubmitOnboardingResult> {
  const phone = opts.socials?.phone?.trim() ?? "";
  const contactEmail = opts.socials?.email?.trim() ?? "";
  const resources = normalizeResources(opts.resources);
  if (!opts.firstName.trim() || !opts.lastName.trim() || !opts.location.trim() ||
      !opts.passions.trim() || (!opts.heartProjectSeeking && !opts.heartProjectDescription?.trim()) ||
      !phone.startsWith("+") || !isPossiblePhoneNumber(phone) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) || !resources || opts.communityIds?.length === 0) {
    return { kind: "missingFields" };
  }

  // Index first. If Gateway embedding fails, no Member/Profile/Invite/Resource write occurs.
  const profileContextEmbeddingInput = buildProfileContextEmbeddingInput(opts);
  const [profileContextEmbedding, indexed] = await Promise.all([
    deps.embedder(profileContextEmbeddingInput),
    Promise.all(resources.map(async (resource) => ({
    ...resource,
    position: resources.filter((r) => r.classification === resource.classification).indexOf(resource),
    embedding: await deps.embedder(resource.description),
    }))),
  ]);
  const socials = Object.fromEntries(SOCIAL_FIELDS.map((field) => [field, opts.socials?.[field]?.trim() || null]));
  socials.phone = parsePhoneNumber(phone).number;
  socials.email = contactEmail;

  const { error } = await deps.db.completeOnboarding({
    ...opts, communityIds: opts.communityIds ?? ["test-community"], resources: indexed, socials, profileContextEmbedding, profileContextEmbeddingInput,
  });
  if (!error) return { kind: "ok" };
  if (error.code === "P0001") return { kind: "invalidCode" };
  if (error.code === "P0002") return { kind: "alreadyClaimed" };
  throw new Error(`completeOnboarding failed: ${error.message}`);
}
