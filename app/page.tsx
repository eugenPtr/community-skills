import Link from "next/link";
import { AuthedMenu } from "@/components/authed-menu";
import { ConversationSidebar } from "@/components/conversation-sidebar";
import { startConversation } from "@/app/chat/actions";
import { supabaseConversationsClient } from "@/lib/people-search/conversations";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">
          Bine ai venit în cufarul cu abilități a Comunității Fain Men
        </h1>
        <p className="text-sm">
          Aici găsești toate resursele ca să-ți transformi proiectul în realitate
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
        <p className="text-sm text-zinc-600">
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

  const hero = (
    <>
      <h1 className="text-2xl font-semibold">
        Bine ai venit în cufarul cu abilități a Comunității de Barbati 
      </h1>
      <p className="text-sm">
        Aici găsești toate resursele ca să-ți transformi proiectul în realitate
      </p>
      <p className="mt-4 text-sm font-medium">Spune ce ai nevoie</p>
      <form
        action={startConversation}
        className="flex w-full items-end gap-2 rounded-2xl border border-zinc-600 bg-zinc-700 p-3"
      >
        <textarea
          name="q"
          rows={3}
          required
          placeholder="Vreau să construiesc o casă din materiale naturale. Cine din comunitate mă poate ajuta?"
          className="flex-1 resize-none bg-transparent text-sm text-left text-white outline-none placeholder:text-zinc-400"
        />
        <button
          type="submit"
          aria-label="Trimite"
          className="rounded-lg bg-purple-600 px-4 py-2 text-white disabled:opacity-50 hover:bg-purple-700"
        >
          Trimite
        </button>
      </form>
    </>
  );

  if (summaries.length === 0) {
    return (
      <>
        <AuthedMenu isAdmin={member.role === "admin"} />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          {hero}
        </main>
      </>
    );
  }

  return (
    <>
      <AuthedMenu isAdmin={member.role === "admin"} />
      <div className="flex h-[calc(100vh-3.5rem)] w-full flex-1">
        <ConversationSidebar conversations={summaries} activeId="" />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex w-full max-w-2xl flex-col items-center gap-4">
            {hero}
          </div>
        </main>
      </div>
    </>
  );
}
