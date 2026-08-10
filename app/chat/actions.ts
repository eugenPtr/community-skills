"use server";

import { redirect } from "next/navigation";
import {
  createConversation,
  deleteConversation,
  supabaseConversationsClient,
} from "@/lib/people-search/conversations";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// First send from the home route (issue #23): create the Conversation and route
// to /chat/[id], carrying the first message as ?q so the chat client fires it
// through the normal /api/chat turn (which persists both messages).
export async function startConversation(formData: FormData) {
  const q = String(formData.get("q") ?? "").trim();
  if (!q) return;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!member) redirect("/");

  const id = await createConversation(
    supabaseConversationsClient(supabase),
    user.id,
  );
  redirect(`/chat/${id}?q=${encodeURIComponent(q)}`);
}

export async function deleteConversationAction(
  conversationId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!conversationId) {
    return { ok: false, error: "Conversația nu a putut fi ștearsă." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Trebuie să fii autentificat." };
  }

  try {
    await deleteConversation(
      supabaseConversationsClient(supabase),
      conversationId,
    );
    return { ok: true };
  } catch {
    return { ok: false, error: "Conversația nu a putut fi ștearsă." };
  }
}
