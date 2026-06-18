import type { SupabaseClient } from "@supabase/supabase-js";
import type { Embedder } from "./embed-member";

// People Search orchestrator (issue #23): the retrieve-then-generate step run
// per Member turn. Embed the turn -> match_members through the caller's RLS
// client -> drop the searcher and anything below the floor -> hand the real
// candidates + recent history to the LLM under a strict system prompt.
//
// Every dependency that touches the network (embed, generate) is injected, so
// the seam test drives it with fakes and asserts the key guarantee: the payload
// handed to the model contains only real, matched Members with their real ids.
// That is the regression guard against the hallucinated-roles/links failure.

export const MATCH_COUNT = 12;
// Cosine-similarity floor. A starting constant to tune once real Romanian
// embeddings are observed (ADR-0008 / issue #23).
export const MIN_SIMILARITY = 0.3;

export interface Candidate {
  memberId: string;
  firstName: string;
  lastName: string;
  skills: string;
  passions: string;
  heartProjectDescription: string | null;
  heartProjectSeeking: boolean;
  similarity: number;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SearchMembersDbClient {
  matchMembers(args: {
    queryEmbedding: number[];
    matchCount: number;
    minSimilarity: number;
  }): PromiseLike<{ data: Candidate[] | null; error: { message: string } | null }>;
}

// What the generator receives. `candidates` is the structured ground truth the
// model may recommend from; `contextBlock` is the same data formatted for the
// prompt. The generator (a streaming adapter in production, a fake in tests)
// composes system + history + the final user turn from this.
export interface GenerationRequest {
  system: string;
  history: ConversationMessage[];
  query: string;
  candidates: Candidate[];
  contextBlock: string;
}

export const SYSTEM_PROMPT = `You are People Search for a private, invite-only community ("Fain Men"). A Member describes who they need; you recommend real Members from the community.

Hard rules:
- Recommend ONLY people from the CANDIDATES list provided in the user message. Never invent people, job titles, roles, or organisations.
- Never output any external link. Link each recommended person exactly as [Full Name](/profile/{member_id}) using the member_id from CANDIDATES. No other URLs.
- Give a short reason for each person describing what they specialise in, drawn only from their candidate details.
- Answer in Romanian.
- If CANDIDATES is empty, say plainly in Romanian that nobody in the community matches this need yet. Do not suggest anyone.
- Count only from the provided CANDIDATES list.`;

export function formatCandidates(candidates: Candidate[]): string {
  if (candidates.length === 0) return "CANDIDATES: (none)";
  const lines = candidates.map((c) => {
    const heartProject = c.heartProjectSeeking
      ? "seeking a heart project"
      : (c.heartProjectDescription?.trim() ?? "");
    return [
      `- member_id: ${c.memberId}`,
      `  name: ${c.firstName} ${c.lastName}`,
      `  skills: ${c.skills}`,
      `  heart_project: ${heartProject}`,
      `  passions: ${c.passions}`,
    ].join("\n");
  });
  return `CANDIDATES:\n${lines.join("\n")}`;
}

export async function searchMembers<T>(
  deps: {
    embedder: Embedder;
    db: SearchMembersDbClient;
    generate: (req: GenerationRequest) => T;
  },
  opts: {
    query: string;
    searcherId: string;
    history?: ConversationMessage[];
  },
): Promise<{ candidates: Candidate[]; result: T }> {
  const queryEmbedding = await deps.embedder(opts.query);

  const { data, error } = await deps.db.matchMembers({
    queryEmbedding,
    matchCount: MATCH_COUNT,
    minSimilarity: MIN_SIMILARITY,
  });
  if (error) throw new Error(`matchMembers failed: ${error.message}`);

  // Self-exclusion: never suggest the searcher to themselves.
  const candidates = (data ?? []).filter((c) => c.memberId !== opts.searcherId);

  const request: GenerationRequest = {
    system: SYSTEM_PROMPT,
    history: opts.history ?? [],
    query: opts.query,
    candidates,
    contextBlock: formatCandidates(candidates),
  };

  return { candidates, result: deps.generate(request) };
}

// Production adapter. match_members runs through the authenticated Member's
// cookie-bound client so the RLS member gate (ADR-0006) is enforced in the DB:
// a non-Member's call returns nothing. The query vector is sent as its pgvector
// text literal ("[..]").
export function supabaseSearchMembersClient(
  supabase: SupabaseClient,
): SearchMembersDbClient {
  return {
    async matchMembers({ queryEmbedding, matchCount, minSimilarity }) {
      const { data, error } = await supabase.rpc("match_members", {
        query_embedding: JSON.stringify(queryEmbedding),
        match_count: matchCount,
        min_similarity: minSimilarity,
      });
      return {
        data:
          (data as MatchMembersRow[] | null)?.map((r) => ({
            memberId: r.member_id,
            firstName: r.first_name,
            lastName: r.last_name,
            skills: r.skills,
            passions: r.passions,
            heartProjectDescription: r.heart_project_description,
            heartProjectSeeking: r.heart_project_seeking,
            similarity: r.similarity,
          })) ?? null,
        error: error ? { message: error.message } : null,
      };
    },
  };
}

interface MatchMembersRow {
  member_id: string;
  first_name: string;
  last_name: string;
  skills: string;
  passions: string;
  heart_project_description: string | null;
  heart_project_seeking: boolean;
  similarity: number;
}
