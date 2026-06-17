import Link from "next/link";
import { AuthedMenu } from "@/components/authed-menu";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">
          Welcome to the community skills chest
        </h1>
        <p className="text-sm text-zinc-600">
          This is where you find all the resources to make your project reality
        </p>
        <Link
          href="/sign-in"
          className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
        >
          Sign in
        </Link>
      </main>
    );
  }

  const { data: member } = await supabase
    .from("members")
    .select("id, email")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (!member) {
    // Authenticated but onboarding never completed (ADR-0004: expected and
    // transient). We have no Invite code here, so we can't resume onboarding —
    // point them back to their Invite link, which carries it.
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
        <h1 className="text-2xl font-semibold">Finish joining</h1>
        <p className="text-sm text-zinc-600">
          You haven't completed onboarding yet. Open your invite link again to
          pick up where you left off.
        </p>
      </main>
    );
  }

  return (
    <>
      <AuthedMenu />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">
          Welcome to the community skills chest
        </h1>
      <p className="text-sm text-zinc-600">
        This is where you find all the resources to make your project reality
      </p>
      <p className="mt-4 text-sm font-medium">Say what you need</p>
      <div className="flex w-full items-end gap-2 rounded-2xl border border-zinc-300 bg-white p-3">
        <textarea
          rows={3}
          disabled
          placeholder="I want to build a house with natural materials. Who in the community can help me?"
          className="flex-1 resize-none bg-transparent text-sm text-left outline-none placeholder:text-zinc-400 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          disabled
          aria-label="Send"
          className="rounded-lg bg-purple-600 px-4 py-2 text-white disabled:opacity-50 hover:bg-purple-700"
        >
          Send
        </button>
        </div>
      </main>
    </>
  );
}
