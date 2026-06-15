import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { claimInviteAction } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  "invalid-code": "That code doesn't exist. Double-check it and try again.",
  "already-claimed":
    "That code has already been claimed. Each invite is single-use.",
  "missing-code": "Please enter your invite code.",
};

type SearchParams = Promise<{ error?: string }>;

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/sign-in");
  }

  const { error } = await searchParams;
  const message = error ? ERROR_MESSAGES[error] ?? error : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold">Claim your invite</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Paste the code you were sent. It's single-use.
        </p>
      </div>

      <form action={claimInviteAction} className="flex flex-col gap-3">
        <label htmlFor="code" className="text-sm font-medium">
          Invite code
        </label>
        <input
          id="code"
          name="code"
          required
          autoComplete="off"
          className="rounded border border-zinc-300 px-3 py-2 font-mono"
          placeholder="DEV-AAAA-0001"
        />
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-white"
        >
          Claim
        </button>
      </form>

      {message ? <p className="text-sm text-red-700">{message}</p> : null}
    </main>
  );
}
