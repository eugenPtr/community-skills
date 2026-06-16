"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

// Server actions hand transient feedback back through redirect query params
// (?error= / ?sent=). This client component surfaces them as a toast, then
// strips the param so a refresh doesn't replay it. See AGENTS.md "UI feedback".
const ERROR_MESSAGES: Record<string, string> = {
  "missing-email": "Enter your email address.",
  "missing-fields": "Please fill in all required fields.",
  "already-claimed":
    "This invite has already been claimed — contact the person who invited you.",
};

// sent=invite: a valid Invite was attached, so we can confirm definitely.
// sent=*: neutral confirmation that never reveals whether the email is a
// Member. See ADR-0005.
const SENT_MESSAGES: Record<string, string> = {
  invite: "An email with a login link has been sent.",
};
const SENT_MESSAGE_NEUTRAL =
  "If an account exists for this email, a link was sent.";

export function SearchParamsToast() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const handled = useRef<string | null>(null);

  const error = searchParams.get("error");
  const sent = searchParams.get("sent");

  useEffect(() => {
    if (!error && !sent) return;

    const key = `${error ?? ""}|${sent ?? ""}`;
    if (handled.current === key) return;
    handled.current = key;

    if (error) {
      toast.error(ERROR_MESSAGES[error] ?? error);
    } else if (sent) {
      toast.success(SENT_MESSAGES[sent] ?? SENT_MESSAGE_NEUTRAL);
    }

    const next = new URLSearchParams(searchParams);
    next.delete("error");
    next.delete("sent");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [error, sent, searchParams, pathname, router]);

  return null;
}
