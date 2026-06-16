import { validateInvite } from "@/lib/invites/validate";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { sendMagicLink } from "./actions";
import { SubmitButton } from "./submit-button";

type SearchParams = Promise<{ sent?: string; error?: string; invite?: string }>;

export default async function SignInPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { invite } = await searchParams;

  if (invite) {
    const service = await createSupabaseServiceClient();
    const result = await validateInvite(
      {
        findInvite: async (code) => {
          const { data } = await service
            .from("invites")
            .select("claimed_by")
            .eq("code", code)
            .maybeSingle();
          return data === null ? null : { claimedBy: data.claimed_by };
        },
      },
      invite,
    );

    if (result.kind === "invalid") {
      return (
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
          <h1 className="text-2xl font-semibold">Invitation code invalid</h1>
          <p className="text-sm text-zinc-600">
            This invite code doesn't exist. Check the link you were sent.
          </p>
        </main>
      );
    }

    if (result.kind === "already-claimed") {
      return (
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
          <h1 className="text-2xl font-semibold">Invite already used</h1>
          <p className="text-sm text-zinc-600">
            This invite has already been claimed. Contact the person who invited you.
          </p>
        </main>
      );
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Enter your email — we'll send you a magic link.
          {invite ? " Your invite is ready — just sign in." : " You'll need an invite code on the next screen."}
        </p>
      </div>

      <form action={sendMagicLink} className="flex flex-col gap-3">
        {invite ? <input type="hidden" name="invite" value={invite} /> : null}
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="rounded border border-zinc-300 px-3 py-2"
          placeholder="you@example.com"
        />
        <SubmitButton />
      </form>
    </main>
  );
}
