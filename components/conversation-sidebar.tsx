"use client";

import { useState } from "react";
import Link from "next/link";
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
  const [open, setOpen] = useState(false);

  const list = (
    <nav className="flex h-full flex-col gap-1 p-3">
      <Link
        href="/"
        className="mb-2 rounded-lg bg-purple-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-purple-700"
      >
        + Conversație nouă
      </Link>
      {conversations.map((c) => (
        <Link
          key={c.id}
          href={`/chat/${c.id}`}
          onClick={() => setOpen(false)}
          className={`truncate rounded-lg px-3 py-2 text-sm ${
            c.id === activeId
              ? "bg-zinc-200 font-medium text-zinc-900"
              : "text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          {c.title?.trim() || "Conversație fără titlu"}
        </Link>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile: a button opens the drawer. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="m-3 inline-flex items-center gap-1 self-start rounded-lg border border-zinc-300 px-3 py-1.5 text-sm md:hidden"
      >
        ☰ Conversații
      </button>

      {/* Desktop: always-visible column. */}
      <aside className="hidden w-64 shrink-0 border-r border-zinc-200 md:block">
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
          <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
            {list}
          </div>
        </div>
      )}
    </>
  );
}
