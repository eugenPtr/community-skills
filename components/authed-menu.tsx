"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOutAction } from "@/app/auth/sign-out";
import { deleteConversationAction } from "@/app/chat/actions";
import type { ConversationSummary } from "@/lib/people-search/conversations";
import { toast } from "sonner";

// The shared navigation on every authed page (home/People Search, Members,
// any Profile). The app title returns to People Search; the burger menu holds
// Profile / Members / Sign out (issue #17). The root layout renders it only
// after the authenticated caller has completed onboarding as a Member.
//
// `isAdmin` reveals the Admin item (the Admin Dashboard entry, issue #20). Each
// authed page derives it from the caller's member role; non-Admins never see it.
export function AuthedMenu({
  isAdmin = false,
  conversations,
}: {
  isAdmin?: boolean;
  conversations: ConversationSummary[];
}) {
  const [open, setOpen] = useState(false);
  const [conversationMenu, setConversationMenu] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const activeId = pathname.startsWith("/chat/") ? pathname.split("/")[2] : "";

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (
        window.matchMedia("(min-width: 768px)").matches &&
        ref.current &&
        !ref.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function removeConversation(id: string) {
    startTransition(async () => {
      const result = await deleteConversationAction(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Conversația a fost ștearsă.");
      setConversationMenu(null);
      setOpen(false);
      if (id === activeId) router.push("/");
      else router.refresh();
    });
  }

  const menuLinks = (
    <>
      <Link href="/members" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-zinc-100 hover:bg-zinc-800">Membri</Link>
      <Link href="/profile" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-zinc-100 hover:bg-zinc-800">Profil</Link>
      {isAdmin && <Link href="/admin/dashboard" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-zinc-100 hover:bg-zinc-800">Admin</Link>}
    </>
  );

  return (
    <header className="sticky top-0 z-30 flex h-15 items-center bg-background px-4">
      <div className="flex items-center gap-2 md:contents">
        <button
          type="button"
          aria-label="Deschide meniul"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-white hover:bg-white/10 md:hidden"
        >
          <MenuIcon />
        </button>
        <Link href="/" className="text-sm font-semibold text-white">
          Rețeaua de suport
        </Link>
      </div>

      <div ref={ref} className="relative ml-auto hidden md:block">
        <button
          type="button"
          aria-label="Meniu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-white hover:bg-white/10"
        >
          <MenuIcon />
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-lg">
            {isAdmin && <Link href="/admin/dashboard" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-700">Admin</Link>}
            <Link href="/profile" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-700">Profil</Link>
            <Link href="/members" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-700">Membri</Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="block w-full px-4 py-2 text-left text-sm text-zinc-100 hover:bg-zinc-700"
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" aria-label="Închide meniul" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/60" />
          <aside className="mobile-menu-drawer absolute inset-y-0 left-0 flex w-[85vw] max-w-90 flex-col border-r border-zinc-800 bg-zinc-950 shadow-2xl">
            <div className="flex h-15 items-center justify-between border-b border-zinc-800 px-4">
              <Link href="/" onClick={() => setOpen(false)} className="text-sm font-semibold text-white">Rețeaua de suport</Link>
              <button type="button" aria-label="Închide meniul" onClick={() => setOpen(false)} className="flex size-9 items-center justify-center rounded-full text-zinc-300 hover:bg-zinc-800 hover:text-white"><CloseIcon /></button>
            </div>
            <nav className="px-3 py-3">{menuLinks}</nav>
            <div className="mx-3 border-t border-zinc-800 pt-3">
              <Link href="/" onClick={() => setOpen(false)} className="block w-full rounded-xl border border-zinc-700 px-3 py-2.5 text-center text-sm font-medium text-zinc-200 hover:bg-zinc-800">Conversație nouă</Link>
            </div>
            <section className="mt-5 min-h-0 flex-1 overflow-y-auto px-3" aria-labelledby="recent-conversations">
              <h2 id="recent-conversations" className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Recente</h2>
              <div className="space-y-1">
                {conversations.map((conversation) => (
                  <div key={conversation.id} className={`relative flex items-center rounded-xl text-sm ${conversation.id === activeId ? "bg-zinc-800 text-white" : "text-zinc-200 hover:bg-zinc-900"}`}>
                    <Link href={`/chat/${conversation.id}`} onClick={() => setOpen(false)} className="min-w-0 flex-1 truncate px-3 py-2.5 pr-10">{conversation.title?.trim() || "Conversație fără titlu"}</Link>
                    <button type="button" aria-label={`Acțiuni pentru ${conversation.title?.trim() || "conversația fără titlu"}`} onClick={() => setConversationMenu((current) => current === conversation.id ? null : conversation.id)} className="absolute right-1 flex size-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-700 hover:text-white"><MoreIcon /></button>
                    {conversationMenu === conversation.id && (
                      <div className="absolute right-1 top-9 z-10 rounded-xl border border-zinc-700 bg-zinc-800 p-1 shadow-xl">
                        <button type="button" disabled={isPending} onClick={() => removeConversation(conversation.id)} className="whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-zinc-700 disabled:opacity-50">Șterge conversația</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
            <form action={signOutAction} className="border-t border-zinc-800 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button type="submit" className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white">Sign out</button>
            </form>
          </aside>
        </div>
      )}
    </header>
  );
}

function MenuIcon() { return <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="3" y1="6" x2="17" y2="6" /><line x1="3" y1="10" x2="17" y2="10" /><line x1="3" y1="14" x2="17" y2="14" /></svg>; }
function CloseIcon() { return <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg>; }
function MoreIcon() { return <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><circle cx="4" cy="10" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="16" cy="10" r="1.5" /></svg>; }
