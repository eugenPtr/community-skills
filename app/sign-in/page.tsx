import { sendMagicLink } from "./actions";
import { SubmitButton } from "./submit-button";

type SearchParams = Promise<{ sent?: string; error?: string; invite?: string }>;

export default async function SignInPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { sent, error, invite } = await searchParams;

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

      {sent ? (
        <p className="text-sm text-green-700">
          Check your inbox for the sign-in link.
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-700">Sign-in failed: {error}</p>
      ) : null}
    </main>
  );
}
