import { streamText, type UIMessage } from "ai";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  searchMembers,
  supabaseSearchMembersClient,
  type ConversationMessage,
} from "@/lib/people-search/search-members";
import {
  addMessage,
  supabaseConversationsClient,
} from "@/lib/people-search/conversations";
import {
  answerModel,
  buildAnswerMessages,
  gatewayEmbedder,
  generateTitle,
} from "@/lib/people-search/ai-gateway";

// People Search turn (issue #23, ADR-0001 retrieve-then-generate). Each turn:
// gate to a signed-in Member -> persist the Member message under the 10-message
// cap -> re-search the community afresh through the Member's RLS client (so a
// topic shift mid-Conversation still finds the right people) -> stream Haiku's
// answer over only the matched candidates, persisting it (and a title on the
// first turn) when the stream finishes.

function latestUserText(messages: UIMessage[]): string {
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") return "";
  return last.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
    .trim();
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // Member gate (story 26): People Search is for signed-in Members only.
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!member) return new Response("Forbidden", { status: 403 });

  const body = (await req.json()) as {
    conversationId?: string;
    messages?: UIMessage[];
  };
  const conversationId = body.conversationId;
  const messages = body.messages ?? [];
  const query = latestUserText(messages);
  if (!conversationId || !query) {
    return new Response("Bad Request", { status: 400 });
  }

  const conversations = supabaseConversationsClient(supabase);

  // Prior turns become the LLM's history; load before persisting this turn so
  // the new message isn't double-counted. (RLS scopes this to the Member's own
  // Conversation; a stranger's id returns nothing.)
  const history = (await conversations.listMessages(
    conversationId,
  )) as ConversationMessage[];
  const isFirstTurn = history.length === 0;

  // Enforce the 10-Member-message cap server-side (story 19). The 11th is
  // rejected and nothing is written.
  const added = await addMessage(conversations, {
    conversationId,
    role: "user",
    content: query,
  });
  if (added.kind === "capReached") {
    return new Response("Message limit reached", { status: 429 });
  }

  const { result } = await searchMembers(
    {
      embedder: gatewayEmbedder,
      db: supabaseSearchMembersClient(supabase),
      generate: (request) =>
        streamText({
          model: answerModel,
          system: request.system,
          messages: buildAnswerMessages(request),
          onFinish: async ({ text }) => {
            await addMessage(conversations, {
              conversationId,
              role: "assistant",
              content: text,
            });
            if (isFirstTurn) {
              await conversations.setTitle(
                conversationId,
                await generateTitle(query),
              );
            }
          },
        }),
    },
    { query, searcherId: member.id, history },
  );

  return result.toUIMessageStreamResponse();
}
