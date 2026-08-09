import type { SupabaseClient } from "@supabase/supabase-js";
import { buildEmbeddingInput, buildProfileContextEmbeddingInput } from "./embedding-input";

export type Embedder = (input: string) => Promise<number[]>;

export interface EmbedResourceDbClient {
  getResource(id: string): PromiseLike<{ data: { description: string } | null; error: { message: string } | null }>;
  writeEmbedding(data: { id: string; embedding: number[]; embeddingInput: string }): PromiseLike<{ error: { message: string } | null }>;
}

export interface EmbedProfileContextDbClient {
  getProfileContext(id: string): PromiseLike<{ data: {
    passions: string;
    heartProjectDescription: string | null;
    heartProjectSeeking: boolean;
  } | null; error: { message: string } | null }>;
  writeProfileContextEmbedding(data: {
    id: string;
    embedding: number[];
    embeddingInput: string;
  }): PromiseLike<{ error: { message: string } | null }>;
}

export async function embedResource(
  deps: { embedder: Embedder; db: EmbedResourceDbClient }, id: string,
): Promise<{ embeddingInput: string }> {
  const { data, error } = await deps.db.getResource(id);
  if (error) throw new Error(`getResource failed: ${error.message}`);
  if (!data) throw new Error(`embedResource: no resource ${id}`);
  const embeddingInput = buildEmbeddingInput(data.description);
  const embedding = await deps.embedder(embeddingInput);
  const { error: writeError } = await deps.db.writeEmbedding({ id, embedding, embeddingInput });
  if (writeError) throw new Error(`writeEmbedding failed: ${writeError.message}`);
  return { embeddingInput };
}

export async function embedProfileContext(
  deps: { embedder: Embedder; db: EmbedProfileContextDbClient }, id: string,
): Promise<{ embeddingInput: string }> {
  const { data, error } = await deps.db.getProfileContext(id);
  if (error) throw new Error(`getProfileContext failed: ${error.message}`);
  if (!data) throw new Error(`embedProfileContext: no profile ${id}`);
  const embeddingInput = buildProfileContextEmbeddingInput(data);
  const embedding = await deps.embedder(embeddingInput);
  const { error: writeError } = await deps.db.writeProfileContextEmbedding({ id, embedding, embeddingInput });
  if (writeError) throw new Error(`writeProfileContextEmbedding failed: ${writeError.message}`);
  return { embeddingInput };
}

export function supabaseEmbedResourceClient(supabase: SupabaseClient): EmbedResourceDbClient {
  return {
    async getResource(id) {
      const { data, error } = await supabase.from("resources").select("description").eq("id", id).maybeSingle();
      return { data, error: error ? { message: error.message } : null };
    },
    async writeEmbedding({ id, embedding, embeddingInput }) {
      const { error } = await supabase.from("resources").update({
        embedding: JSON.stringify(embedding), embedding_input: embeddingInput, embedded_at: new Date().toISOString(),
      }).eq("id", id);
      return { error: error ? { message: error.message } : null };
    },
  };
}

export function supabaseEmbedProfileContextClient(supabase: SupabaseClient): EmbedProfileContextDbClient {
  return {
    async getProfileContext(id) {
      const { data, error } = await supabase.from("profiles")
        .select("passions, heart_project_description, heart_project_seeking")
        .eq("member_id", id).maybeSingle();
      return {
        data: data ? {
          passions: data.passions,
          heartProjectDescription: data.heart_project_description,
          heartProjectSeeking: data.heart_project_seeking,
        } : null,
        error: error ? { message: error.message } : null,
      };
    },
    async writeProfileContextEmbedding({ id, embedding, embeddingInput }) {
      const { error } = await supabase.from("profiles").update({
        profile_context_embedding: JSON.stringify(embedding),
        profile_context_embedding_input: embeddingInput,
        profile_context_embedded_at: new Date().toISOString(),
      }).eq("member_id", id);
      return { error: error ? { message: error.message } : null };
    },
  };
}
