import { notFound, redirect } from "next/navigation";
import type { UIMessage } from "ai";
import { AuthedMenu } from "@/components/authed-menu";
import { ChatView } from "@/components/chat-view";
import { ConversationSidebar } from "@/components/conversation-sidebar";
import { supabaseConversationsClient } from "@/lib/people-search/conversations";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// A People Search Conversation (issue #23). Reached via /chat/[id]; the home
// route creates the Conversation and routes here with the first message as ?q.
export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { id } = await params;
  const { q } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Member gate (story 26).
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!member) redirect("/");

  // RLS scopes conversations to the owner, so a foreign or unknown id reads as
  // null -> a clean 404 (story 15 only reopens the Member's own Conversations).
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!conversation) notFound();

  const conversations = supabaseConversationsClient(supabase);
  const [stored, summaries] = await Promise.all([
    conversations.listMessages(id),
    conversations.listConversations(user.id),
  ]);

  // Replay in stored (insertion) order as UIMessages for useChat.
  const initialMessages: UIMessage[] = stored.map((m, i) => ({
    id: String(i),
    role: m.role,
    parts: [{ type: "text", text: m.content }],
  }));

  return (
    <>
      <AuthedMenu />
      <div className="flex h-[calc(100vh-3.5rem)] w-full flex-1">
        <ConversationSidebar conversations={summaries} activeId={id} />
        <main className="flex flex-1 justify-center">
          <div className="flex h-full w-full max-w-3xl flex-col">
            <ChatView
              conversationId={id}
              initialMessages={initialMessages}
              initialQuery={q}
            />
          </div>
        </main>
      </div>
    </>
  );
}
