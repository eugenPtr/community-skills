import type { SupabaseClient } from "@supabase/supabase-js";
import { buildEmbeddingInput, type EmbeddingProfile } from "./embedding-input";

// The one primitive that (re)embeds a single Member (issue #23). Reads the
// Profile, builds the embedding input, calls the embedder, and writes the
// vector + the exact text embedded + the timestamp -- for that Member only, so
// a Profile edit re-embeds exactly one row.
//
// Network (the Gateway embed call) and the database are injected, mirroring the
// onboarding seam: production passes the real Gateway embedder and Supabase
// client; tests pass a deterministic fake embedder and the PGlite adapter, so
// no test touches the network.

export type Embedder = (input: string) => Promise<number[]>;

export interface EmbedMemberDbClient {
  getEmbeddingProfile(
    memberId: string,
  ): PromiseLike<{ data: EmbeddingProfile | null; error: { message: string } | null }>;
  writeEmbedding(data: {
    memberId: string;
    embedding: number[];
    embeddingInput: string;
  }): PromiseLike<{ error: { message: string } | null }>;
}

export async function embedMember(
  deps: { embedder: Embedder; db: EmbedMemberDbClient },
  memberId: string,
): Promise<{ embeddingInput: string }> {
  const { data: profile, error } = await deps.db.getEmbeddingProfile(memberId);
  if (error) throw new Error(`getEmbeddingProfile failed: ${error.message}`);
  if (!profile) throw new Error(`embedMember: no profile for member ${memberId}`);

  const embeddingInput = buildEmbeddingInput(profile);
  const embedding = await deps.embedder(embeddingInput);

  const { error: writeError } = await deps.db.writeEmbedding({
    memberId,
    embedding,
    embeddingInput,
  });
  if (writeError) throw new Error(`writeEmbedding failed: ${writeError.message}`);

  return { embeddingInput };
}

// Production adapter. Writing the embedding is an UPDATE on profiles, which the
// member-readable RLS grants no policy for, so embed write paths use the
// service-role client (the same path onboarding uses to write the Profile).
// The vector is sent as its pgvector text literal ("[..]").
export function supabaseEmbedMemberClient(
  supabase: SupabaseClient,
): EmbedMemberDbClient {
  return {
    async getEmbeddingProfile(memberId) {
      const { data, error } = await supabase
        .from("profiles")
        .select("skills, passions, heart_project_description, heart_project_seeking")
        .eq("member_id", memberId)
        .maybeSingle();
      return {
        data: data
          ? {
              skills: data.skills,
              passions: data.passions,
              heartProjectDescription: data.heart_project_description,
              heartProjectSeeking: data.heart_project_seeking,
            }
          : null,
        error: error ? { message: error.message } : null,
      };
    },
    async writeEmbedding({ memberId, embedding, embeddingInput }) {
      const { error } = await supabase
        .from("profiles")
        .update({
          embedding: JSON.stringify(embedding),
          embedding_input: embeddingInput,
          embedded_at: new Date().toISOString(),
        })
        .eq("member_id", memberId);
      return { error: error ? { message: error.message } : null };
    },
  };
}
