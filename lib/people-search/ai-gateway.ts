import { embed, generateText, gateway, type ModelMessage } from "ai";
import { env } from "@/lib/env";
import type { Embedder } from "./embed-member";
import type { GenerationRequest } from "./search-members";

// The production AI seams (ADR-0008): embeddings and answers both routed through
// the Vercel AI Gateway on one credential. Providers are never wired directly --
// only these plain "provider/model" strings. Swapping a model is a one-line
// change here. Tests never import this module; they inject fakes instead.
const EMBEDDING_MODEL = "openai/text-embedding-3-small"; // 1536-dim (vector column lock-in)
const ANSWER_MODEL = "anthropic/claude-haiku-4-5";

// Touch the credential so a missing key fails loudly at first use rather than
// surfacing as an opaque Gateway 401.
function assertCredential(): void {
  void env.aiGatewayApiKey;
}

// The embedder injected into embedMember and searchMembers in production.
export const gatewayEmbedder: Embedder = async (input: string) => {
  assertCredential();
  const { embedding } = await embed({
    model: gateway.textEmbeddingModel(EMBEDDING_MODEL),
    value: input,
  });
  return embedding;
};

export const answerModel = gateway(ANSWER_MODEL);

// Compose the model messages for a People Search turn from the orchestrator's
// request: recent Conversation history plus a final user turn that pins the
// candidate list to the question. The strict system prompt is passed via
// streamText's dedicated `system` option (req.system), not as a message --
// keeping the trusted instructions out of the message stream (AI SDK best
// practice; avoids the system-in-messages prompt-injection warning).
export function buildAnswerMessages(req: GenerationRequest): ModelMessage[] {
  return [
    ...req.history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: `${req.contextBlock}\n\nÎntrebare: ${req.query}` },
  ];
}

// A short Romanian title for a Conversation, generated from its first Member
// message (issue #23). Best-effort: falls back to a trimmed slice on failure so
// titling never blocks the answer.
export async function generateTitle(firstMessage: string): Promise<string> {
  assertCredential();
  try {
    const { text } = await generateText({
      model: answerModel,
      prompt: `Rezumă următoarea cerere într-un titlu scurt în română (maxim 5 cuvinte, fără ghilimele):\n\n${firstMessage}`,
    });
    return text.trim().replace(/^["']|["']$/g, "").slice(0, 80);
  } catch {
    return firstMessage.slice(0, 60);
  }
}
