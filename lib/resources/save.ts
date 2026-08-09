import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Embedder } from "@/lib/people-search/embed-member";
import { normalizeResources, type ResourceClassification } from "./model";

export interface ResourceEditInput {
  id: string;
  description: string;
  classification: ResourceClassification;
}

export interface StoredResource extends ResourceEditInput {
  position: number;
  embedding: number[];
  embeddingInput: string;
}

export interface SaveResourcesClient {
  loadResources(memberId: string): PromiseLike<{
    data: StoredResource[] | null;
    error: { message: string } | null;
  }>;
  replaceResources(memberId: string, resources: StoredResource[]): PromiseLike<{
    error: { message: string } | null;
  }>;
}

export type SaveResourcesResult = { kind: "ok" } | { kind: "invalid" };

function positions(resources: ResourceEditInput[]): Array<ResourceEditInput & { position: number }> {
  const next = { free: 0, paid: 0 };
  return resources.map((resource) => ({
    ...resource,
    position: next[resource.classification]++,
  }));
}

// Build every required embedding before the single atomic persistence call.
// Description-stable rows retain their vector even when only category/order changes.
export async function saveResources(
  deps: { db: SaveResourcesClient; embedder: Embedder },
  opts: { memberId: string; resources: ResourceEditInput[] },
): Promise<SaveResourcesResult> {
  const normalized = normalizeResources(opts.resources);
  if (!normalized) return { kind: "invalid" };

  const { data: current, error: loadError } = await deps.db.loadResources(opts.memberId);
  if (loadError) throw new Error(`loadResources failed: ${loadError.message}`);
  const existing = new Map((current ?? []).map((resource) => [resource.id, resource]));

  const indexed = await Promise.all(positions(opts.resources.map((resource, index) => ({
    ...normalized[index],
    id: existing.has(resource.id) ? resource.id : randomUUID(),
  }))).map(async (resource) => {
    const previous = existing.get(resource.id);
    const unchanged = previous?.embeddingInput === resource.description;
    return {
      ...resource,
      embedding: unchanged ? previous.embedding : await deps.embedder(resource.description),
      embeddingInput: resource.description,
    };
  }));

  const { error } = await deps.db.replaceResources(opts.memberId, indexed);
  if (error) throw new Error(`replaceResources failed: ${error.message}`);
  return { kind: "ok" };
}

export function supabaseSaveResourcesClient(supabase: SupabaseClient): SaveResourcesClient {
  return {
    async loadResources(memberId) {
      const { data, error } = await supabase
        .from("resources")
        .select("id, description, classification, position, embedding, embedding_input")
        .eq("member_id", memberId)
        .order("classification", { ascending: true })
        .order("position", { ascending: true });
      return {
        data: data?.map((resource) => ({
          id: resource.id,
          description: resource.description,
          classification: resource.classification,
          position: resource.position,
          embedding: typeof resource.embedding === "string"
            ? JSON.parse(resource.embedding.replace(/^\[/, "[").replace(/\]$/, "]"))
            : resource.embedding,
          embeddingInput: resource.embedding_input,
        })) as StoredResource[] | null,
        error: error ? { message: error.message } : null,
      };
    },
    async replaceResources(_memberId, resources) {
      const { error } = await supabase.rpc("replace_own_resources", {
        p_resources: resources.map((resource) => ({
          id: resource.id,
          description: resource.description,
          classification: resource.classification,
          position: resource.position,
          embedding: JSON.stringify(resource.embedding),
          embedding_input: resource.embeddingInput,
        })),
      });
      return { error: error ? { message: error.message } : null };
    },
  };
}
