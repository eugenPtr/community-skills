"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

// Server actions hand transient feedback back through redirect query params
// (?error= / ?sent=). This client component surfaces them as a toast, then
// strips the param so a refresh doesn't replay it. See AGENTS.md "UI feedback".
const ERROR_MESSAGES: Record<string, string> = {
  "missing-email": "Introdu adresa ta de email.",
  "missing-fields": "Te rugăm să completezi toate câmpurile obligatorii.",
  "already-claimed":
    "Această invitație a fost deja folosită — contactează persoana care te-a invitat.",
};

// sent=*: neutral confirmation that never reveals whether the email is a
// Member. See ADR-0005. The definite invite-mode confirmation is a full-page
// panel (checkInbox=1) rendered by the sign-in page, not a toast.
const SENT_MESSAGES: Record<string, string> = {};
const SENT_MESSAGE_NEUTRAL =
  "Dacă există un cont pentru acest email, a fost trimis un link.";

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
