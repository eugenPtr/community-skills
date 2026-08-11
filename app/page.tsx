import Link from "next/link";
import { ConversationSidebar } from "@/components/conversation-sidebar";
import { HomeComposer } from "@/components/home-composer";
import { supabaseConversationsClient } from "@/lib/people-search/conversations";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">
          Bun venit, barbate! 
        </h1>
        <p className="text-sm">
          Aici găsești toate resursele comunitatii. Vezi cine iti poate aduce valoare in proiectele la care lucrezi
        </p>
        <div className="flex flex-col items-center gap-3">
          <Link
            href="/sign-in"
            className="rounded bg-purple-600 px-10 py-2  text-white hover:bg-purple-700 "
          >
            Intră
          </Link>
          <Link
            href="/join"
            className="text-sm text-purple-700 underline hover:text-purple-900"
          >
            Încă nu am cont
          </Link>
        </div>
      </main>
    );
  }

  const { data: member } = await supabase
    .from("members")
    .select("id, email, role")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (!member) {
    // Authenticated but onboarding never completed (ADR-0004: expected and
    // transient). We have no Invite code here, so we can't resume onboarding —
    // point them back to their Invite link, which carries it.
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
        <h1 className="text-2xl font-semibold">Finalizează înscrierea</h1>
        <p className="text-sm text-zinc-300">
          Încă nu ți-ai finalizat înscrierea. Deschide din nou linkul de
          invitație ca să continui de unde ai rămas.
        </p>
      </main>
    );
  }

  // Past Conversations open the sidebar on the home route too (always visible
  // on desktop). With none yet, home stays the plain welcome hero.
  const summaries = await supabaseConversationsClient(supabase).listConversations(
    member.id,
  );

  const welcome = (
    <>
      <h1 className="text-2xl font-semibold md:text-5xl md:tracking-tight">
        Salut, barbate!
      </h1>
      <p className="text-sm md:text-xl">
        Aici găsești toate resursele comunitatii
      </p>
    </>
  );

  return (
    <div className="flex min-h-0 w-full flex-1">
      {summaries.length > 0 && <ConversationSidebar conversations={summaries} activeId="" />}
      <main className="flex min-h-0 flex-1 flex-col items-center px-4 text-center md:px-6">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 md:-translate-y-12 md:gap-8">
          {welcome}
          <p className="text-sm font-medium md:text-lg">Spune ce ai nevoie</p>
          <div className="mt-4 hidden w-[min(54vw,42rem)] md:block">
            <HomeComposer />
          </div>
        </div>
        <div className="w-full max-w-2xl shrink-0 pb-3 md:hidden">
          <HomeComposer />
        </div>
      </main>
    </div>
  );
}
