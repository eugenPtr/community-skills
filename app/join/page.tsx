import Link from "next/link";

// Dead-end informational page for someone who clicked "I'm new" on the home
// splash. Invites are issued out of band (ADR-0002), so there is nothing to
// submit here -- it only explains how to get in.
export default function JoinPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <Link
        href="/"
        className="inline-flex items-center gap-1 self-start text-sm text-purple-700 hover:text-purple-900"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 5l-5 5 5 5" />
        </svg>
        Back
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">Join the network</h1>
        <p className="mt-2 text-sm text-zinc-600">
          This network is for men who've taken part in at least one Man
          Circle at Camping Fain.
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          To join, ask a community admin to send you an invite link.
        </p>
      </div>
      <p className="text-sm text-zinc-600">
        Already have an invite link? Just click it to join.
      </p>
    </main>
  );
}
