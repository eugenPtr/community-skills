import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConversationMessage } from "./search-members";

// Conversation persistence rules (issue #23). The business rules live here so
// they are tested through the PGlite seam (Seam D), independent of the route:
//   - a Conversation holds at most 10 Member ("user") messages; the 11th is
//     rejected server-side and no row is written;
//   - messages replay in insertion order (the DB orders by the bigint id, never
//     by clock);
//   - retention (90 days) is a DB function the daily cron calls; exposed here so
//     the seam can drive it.
//
// The DB is injected (the same pattern as onboarding/embed): production passes
// the cookie-bound Supabase client (RLS scopes rows to the Member); tests pass
// the PGlite adapter.

export const MEMBER_MESSAGE_CAP = 10;

export interface ConversationSummary {
  id: string;
  title: string | null;
  lastMessageAt: string;
}

export interface ConversationsDbClient {
  createConversation(memberId: string): PromiseLike<{ id: string }>;
  countMemberMessages(conversationId: string): PromiseLike<number>;
  insertMessage(data: {
    conversationId: string;
    role: "user" | "assistant";
    content: string;
  }): PromiseLike<void>;
  touchConversation(conversationId: string): PromiseLike<void>;
  setTitle(conversationId: string, title: string): PromiseLike<void>;
  listMessages(conversationId: string): PromiseLike<ConversationMessage[]>;
  listConversations(memberId: string): PromiseLike<ConversationSummary[]>;
  deleteExpiredConversations(): PromiseLike<void>;
}

export type AddMessageResult = { kind: "ok" } | { kind: "capReached" };

// Append a message. A "user" message past the cap is rejected and nothing is
// written; "assistant" messages (the AI's answers) are never capped.
export async function addMessage(
  db: ConversationsDbClient,
  data: { conversationId: string; role: "user" | "assistant"; content: string },
): Promise<AddMessageResult> {
  if (data.role === "user") {
    const count = await db.countMemberMessages(data.conversationId);
    if (count >= MEMBER_MESSAGE_CAP) return { kind: "capReached" };
  }
  await db.insertMessage(data);
  await db.touchConversation(data.conversationId);
  return { kind: "ok" };
}

export async function createConversation(
  db: ConversationsDbClient,
  memberId: string,
): Promise<string> {
  const { id } = await db.createConversation(memberId);
  return id;
}

// Production adapter over the cookie-bound server client: RLS ("own
// conversations" / "own messages") scopes every read and write to the calling
// Member, so the ownership gate lives in the DB.
export function supabaseConversationsClient(
  supabase: SupabaseClient,
): ConversationsDbClient {
  return {
    async createConversation(memberId) {
      const { data, error } = await supabase
        .from("conversations")
        .insert({ member_id: memberId })
        .select("id")
        .single();
      if (error) throw new Error(`createConversation failed: ${error.message}`);
      return { id: data.id };
    },
    async countMemberMessages(conversationId) {
      const { count, error } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conversationId)
        .eq("role", "user");
      if (error) throw new Error(`countMemberMessages failed: ${error.message}`);
      return count ?? 0;
    },
    async insertMessage({ conversationId, role, content }) {
      const { error } = await supabase
        .from("messages")
        .insert({ conversation_id: conversationId, role, content });
      if (error) throw new Error(`insertMessage failed: ${error.message}`);
    },
    async touchConversation(conversationId) {
      const { error } = await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
      if (error) throw new Error(`touchConversation failed: ${error.message}`);
    },
    async setTitle(conversationId, title) {
      const { error } = await supabase
        .from("conversations")
        .update({ title })
        .eq("id", conversationId);
      if (error) throw new Error(`setTitle failed: ${error.message}`);
    },
    async listMessages(conversationId) {
      const { data, error } = await supabase
        .from("messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("id", { ascending: true });
      if (error) throw new Error(`listMessages failed: ${error.message}`);
      return (data ?? []) as ConversationMessage[];
    },
    async listConversations(memberId) {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, title, last_message_at")
        .eq("member_id", memberId)
        .order("last_message_at", { ascending: false });
      if (error) throw new Error(`listConversations failed: ${error.message}`);
      return (data ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        lastMessageAt: r.last_message_at,
      }));
    },
    async deleteExpiredConversations() {
      const { error } = await supabase.rpc("delete_expired_conversations");
      if (error)
        throw new Error(`deleteExpiredConversations failed: ${error.message}`);
    },
  };
}
