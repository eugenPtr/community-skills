"use server";

import { redirect } from "next/navigation";
import {
  createConversation,
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
