"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteConversationAction } from "@/app/chat/actions";
import type { ConversationSummary } from "@/lib/people-search/conversations";

// Past Conversations + "New chat" (stories 13, 14, 24, 25). Always visible on
// desktop; a toggleable drawer on mobile so the narrow screen stays on the chat.
// The app-wide AuthedMenu burger is separate -- it has a different job.
export function ConversationSidebar({
  conversations,
  activeId,
}: {
  conversations: ConversationSummary[];
  activeId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function removeConversation(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteConversationAction(id);
      setDeletingId(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Conversația a fost ștearsă.");
      setOpen(false);
      if (id === activeId) router.push("/");
      else router.refresh();
    });
  }

  const list = (
    <nav className="flex h-full flex-col gap-1 p-3">
      <Link
        href="/"
        className="mb-2 rounded-lg bg-purple-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-purple-700"
      >
        + Conversație nouă
      </Link>
      {conversations.map((c) => (
        <div
          key={c.id}
          className={`group relative flex items-center rounded-lg text-sm text-white ${
            c.id === activeId
              ? "bg-zinc-700 font-medium"
              : "hover:bg-zinc-800"
          }`}
        >
          <Link
            href={`/chat/${c.id}`}
            onClick={() => setOpen(false)}
            className="min-w-0 flex-1 truncate px-3 py-2 pr-9"
          >
            {c.title?.trim() || "Conversație fără titlu"}
          </Link>
          <button
            type="button"
            aria-label={`Șterge ${c.title?.trim() || "conversația fără titlu"}`}
            onClick={() => removeConversation(c.id)}
            disabled={isPending}
            className="absolute right-1.5 inline-flex size-6 items-center justify-center rounded text-zinc-300 opacity-100 transition hover:bg-zinc-600 hover:text-white focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-wait disabled:opacity-50 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
          >
            <span aria-hidden="true">×</span>
          </button>
          {deletingId === c.id ? (
            <span className="sr-only" role="status">Se șterge</span>
          ) : null}
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile: a button opens the drawer. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="m-3 inline-flex items-center gap-1 self-start rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-white md:hidden"
      >
        ☰ Conversații
      </button>

      {/* Desktop: always-visible column. */}
      <aside className="hidden w-48 shrink-0 border-r border-zinc-800 md:block">
        {list}
      </aside>

      {/* Mobile drawer. */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Închide"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/30"
          />
          <div className="absolute left-0 top-0 h-full w-48 bg-zinc-900 shadow-xl">
            {list}
          </div>
        </div>
      )}
    </>
  );
}
