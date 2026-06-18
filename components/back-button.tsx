"use client";

import { useRouter } from "next/navigation";

// History-aware back affordance (AGENTS.md "Navigation"): returns to wherever
// the Member came from -- a Conversation, the Directory, etc. -- using
// router.back() when there is in-app history, and falling back to a known route
// on a cold/direct load. Pages reuse this instead of hand-rolling router.back().
export function BackButton({
  fallbackHref,
  label = "Înapoi",
}: {
  fallbackHref: string;
  label?: string;
}) {
  const router = useRouter();

  function goBack() {
    // window.history.length > 1 means we navigated here within the app.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className="inline-flex items-center gap-1 text-sm text-zinc-300 hover:text-white"
    >
      <span aria-hidden>←</span>
      {label}
    </button>
  );
}
