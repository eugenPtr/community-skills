import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.108.1";
import { embed, gateway } from "npm:ai@6.0.207";
import { embedProfileContext, supabaseEmbedProfileContextClient } from "../../../lib/people-search/embed-member.ts";
import { createProfileWebhookHandler } from "./handler.ts";

const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const supabase = createClient(
  required("SUPABASE_URL"),
  required("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const handler = createProfileWebhookHandler({
  async reembedProfile(memberId) {
    return embedProfileContext({
      db: supabaseEmbedProfileContextClient(supabase),
      embedder: async (input) => {
        required("AI_GATEWAY_API_KEY");
        const { embedding } = await embed({
          model: gateway.textEmbeddingModel(EMBEDDING_MODEL),
          value: input,
        });
        if (embedding.length !== EMBEDDING_DIMENSIONS) {
          throw new Error(`Expected ${EMBEDDING_DIMENSIONS} embedding dimensions, received ${embedding.length}`);
        }
        return embedding;
      },
    }, memberId);
  },
});

Deno.serve(handler);
