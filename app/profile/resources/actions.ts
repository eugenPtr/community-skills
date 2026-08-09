"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { gatewayEmbedder } from "@/lib/people-search/ai-gateway";
import {
  saveResources,
  supabaseSaveResourcesClient,
  type ResourceEditInput,
} from "@/lib/resources/save";

export async function saveResourcesAction(resources: ResourceEditInput[]) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { kind: "unauthorized" } as const;

  return saveResources(
    { db: supabaseSaveResourcesClient(supabase), embedder: gatewayEmbedder },
    { memberId: user.id, resources },
  );
}
