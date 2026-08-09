import type { SupabaseClient } from "@supabase/supabase-js";
import type { Embedder } from "./embed-member";

export const RESOURCE_MATCH_COUNT = 12;
export const PROFILE_MATCH_COUNT = 12;
export const MAX_GENERATION_CANDIDATES = 10;
export const RESOURCE_MIN_SIMILARITY = 0.3;
export const PROFILE_MIN_SIMILARITY = 0.3;

export type Evidence =
  | { type: "free_resource" | "paid_resource"; text: string; similarity: number; resourceId: string }
  | { type: "passion" | "heart_project"; text: string; similarity: number };

export interface Candidate {
  memberId: string;
  firstName: string;
  lastName: string;
  evidence: Evidence[];
  similarity: number;
}

export interface ResourceMatch {
  memberId: string;
  firstName: string;
  lastName: string;
  resourceId: string;
  description: string;
  classification: "free" | "paid";
  similarity: number;
}

export interface ProfileContextMatch {
  memberId: string;
  firstName: string;
  lastName: string;
  passions: string;
  heartProjectDescription: string | null;
  heartProjectSeeking: boolean;
  similarity: number;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

type RetrievalResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

export interface SearchMembersDbClient {
  matchResources(args: { queryEmbedding: number[]; matchCount: number; minSimilarity: number }): RetrievalResult<ResourceMatch>;
  matchProfileContexts(args: { queryEmbedding: number[]; matchCount: number; minSimilarity: number }): RetrievalResult<ProfileContextMatch>;
}

export interface GenerationRequest {
  system: string;
  history: ConversationMessage[];
  query: string;
  candidates: Candidate[];
  contextBlock: string;
}

export const SYSTEM_PROMPT = `You are People Search for a private, invite-only community ("Fain Men"). A Member describes who they need; you recommend real Members from the community.

Hard rules:
- Recommend ONLY people from the CANDIDATES list provided in the user message. Never invent people, job titles, roles, organisations, availability, or services.
- Never output any external link. Link each recommended person exactly as [Full Name](/profile/{member_id}) using the member_id from CANDIDATES. No other URLs.
- Explain the exact supporting evidence. free_resource and paid_resource are offers. passion and heart_project mean only that the Member is interested in the topic; never describe them as an offer or imply availability.
- State Resource classification accurately as gratuit (free_resource) or contra cost (paid_resource).
- Answer in Romanian.
- If CANDIDATES is empty, say plainly in Romanian that nobody in the community matches this need yet. Do not suggest anyone.
- Count only from the provided CANDIDATES list.`;

export function formatCandidates(candidates: Candidate[]): string {
  if (candidates.length === 0) return "CANDIDATES: (none)";
  return `CANDIDATES:\n${candidates.map((candidate) => [
    `- member_id: ${candidate.memberId}`,
    `  name: ${candidate.firstName} ${candidate.lastName}`,
    "  evidence:",
    ...candidate.evidence.map((evidence) =>
      `    - type: ${evidence.type}\n      text: ${JSON.stringify(evidence.text)}\n      similarity: ${evidence.similarity.toFixed(4)}`),
  ].join("\n")).join("\n")}`;
}

export function isHelpSeekingQuery(query: string): boolean {
  return /\b(caut|caută|am nevoie|nevoie de|mă poate ajuta|ma poate ajuta|recomand|cine poate|oferă|ofera|servici|ajutor|ajute)\b/iu.test(query);
}

export function mergeSearchEvidence(
  resources: ResourceMatch[], profiles: ProfileContextMatch[], searcherId: string, helpSeeking: boolean,
): Candidate[] {
  const merged = new Map<string, Candidate>();
  const candidateFor = (match: { memberId: string; firstName: string; lastName: string }) => {
    let candidate = merged.get(match.memberId);
    if (!candidate) {
      candidate = { memberId: match.memberId, firstName: match.firstName, lastName: match.lastName, evidence: [], similarity: 0 };
      merged.set(match.memberId, candidate);
    }
    return candidate;
  };

  for (const match of resources) {
    if (match.memberId === searcherId) continue;
    const candidate = candidateFor(match);
    candidate.evidence.push({
      type: match.classification === "free" ? "free_resource" : "paid_resource",
      text: match.description,
      similarity: match.similarity,
      resourceId: match.resourceId,
    });
    candidate.similarity = Math.max(candidate.similarity, match.similarity);
  }
  for (const match of profiles) {
    if (match.memberId === searcherId) continue;
    const candidate = candidateFor(match);
    if (match.passions.trim()) candidate.evidence.push({ type: "passion", text: match.passions.trim(), similarity: match.similarity });
    if (match.heartProjectDescription?.trim()) {
      candidate.evidence.push({ type: "heart_project", text: match.heartProjectDescription.trim(), similarity: match.similarity });
    }
    candidate.similarity = Math.max(candidate.similarity, match.similarity);
  }

  const hasOffer = (candidate: Candidate) => candidate.evidence.some((e) => e.type === "free_resource" || e.type === "paid_resource");
  return [...merged.values()].sort((a, b) => {
    if (helpSeeking && hasOffer(a) !== hasOffer(b)) return hasOffer(a) ? -1 : 1;
    return b.similarity - a.similarity;
  }).slice(0, MAX_GENERATION_CANDIDATES);
}

export async function searchMembers<T>(
  deps: { embedder: Embedder; db: SearchMembersDbClient; generate: (req: GenerationRequest) => T },
  opts: { query: string; searcherId: string; history?: ConversationMessage[] },
): Promise<{ candidates: Candidate[]; result: T }> {
  const queryEmbedding = await deps.embedder(opts.query);
  const [resourceResult, profileResult] = await Promise.all([
    deps.db.matchResources({ queryEmbedding, matchCount: RESOURCE_MATCH_COUNT, minSimilarity: RESOURCE_MIN_SIMILARITY }),
    deps.db.matchProfileContexts({ queryEmbedding, matchCount: PROFILE_MATCH_COUNT, minSimilarity: PROFILE_MIN_SIMILARITY }),
  ]);
  if (resourceResult.error) throw new Error(`matchResources failed: ${resourceResult.error.message}`);
  if (profileResult.error) throw new Error(`matchProfileContexts failed: ${profileResult.error.message}`);

  const candidates = mergeSearchEvidence(
    resourceResult.data ?? [], profileResult.data ?? [], opts.searcherId, isHelpSeekingQuery(opts.query),
  );
  const request: GenerationRequest = {
    system: SYSTEM_PROMPT,
    history: opts.history ?? [],
    query: opts.query,
    candidates,
    contextBlock: formatCandidates(candidates),
  };
  return { candidates, result: deps.generate(request) };
}

export function supabaseSearchMembersClient(supabase: SupabaseClient): SearchMembersDbClient {
  return {
    async matchResources(args) {
      const { data, error } = await supabase.rpc("match_resources", rpcArgs(args));
      return { data: (data as ResourceMatchRow[] | null)?.map(mapResourceMatch) ?? null, error: error ? { message: error.message } : null };
    },
    async matchProfileContexts(args) {
      const { data, error } = await supabase.rpc("match_profile_contexts", rpcArgs(args));
      return { data: (data as ProfileContextMatchRow[] | null)?.map(mapProfileMatch) ?? null, error: error ? { message: error.message } : null };
    },
  };
}

function rpcArgs(args: { queryEmbedding: number[]; matchCount: number; minSimilarity: number }) {
  return { query_embedding: JSON.stringify(args.queryEmbedding), match_count: args.matchCount, min_similarity: args.minSimilarity };
}

interface ResourceMatchRow { member_id: string; first_name: string; last_name: string; resource_id: string; description: string; classification: "free" | "paid"; similarity: number }
interface ProfileContextMatchRow { member_id: string; first_name: string; last_name: string; passions: string; heart_project_description: string | null; heart_project_seeking: boolean; similarity: number }

function mapResourceMatch(row: ResourceMatchRow): ResourceMatch {
  return { memberId: row.member_id, firstName: row.first_name, lastName: row.last_name, resourceId: row.resource_id, description: row.description, classification: row.classification, similarity: row.similarity };
}
function mapProfileMatch(row: ProfileContextMatchRow): ProfileContextMatch {
  return { memberId: row.member_id, firstName: row.first_name, lastName: row.last_name, passions: row.passions, heartProjectDescription: row.heart_project_description, heartProjectSeeking: row.heart_project_seeking, similarity: row.similarity };
}
