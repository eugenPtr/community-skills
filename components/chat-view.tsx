"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Streamdown } from "streamdown";
import { MEMBER_MESSAGE_CAP } from "@/lib/people-search/conversations";
import { isInternalHref } from "@/lib/people-search/link-safety";

// Render-time link whitelist (story 31): only internal Member-facing links
// render as anchors; anything else collapses to its text. A hallucinated
// external link can never become a clickable anchor.
type MarkdownComponents = NonNullable<ComponentProps<typeof Streamdown>["components"]>;
const markdownComponents: MarkdownComponents = {
  a({ href, children }) {
    if (isInternalHref(href)) {
      return (
        <a
          href={href}
          className="font-medium text-purple-700 underline hover:text-purple-900"
        >
          {children}
        </a>
      );
    }
    return <>{children}</>;
  },
};

function messageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function ChatView({
  conversationId,
  initialMessages,
  initialQuery,
}: {
  conversationId: string;
  initialMessages: UIMessage[];
  initialQuery?: string;
}) {
  const { messages, sendMessage, status, error } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { conversationId },
    }),
  });

  const [input, setInput] = useState("");
  const memberMessages = messages.filter((m) => m.role === "user").length;
  const atCap = memberMessages >= MEMBER_MESSAGE_CAP;
  const busy = status === "submitted" || status === "streaming";

  // First send from the home route arrives as ?q=...; fire it once.
  const autoSent = useRef(false);
  useEffect(() => {
    if (initialQuery && !autoSent.current && initialMessages.length === 0) {
      autoSent.current = true;
      sendMessage({ text: initialQuery });
    }
  }, [initialQuery, initialMessages.length, sendMessage]);

  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function submit() {
    const text = input.trim();
    if (!text || busy || atCap) return;
    setInput("");
    sendMessage({ text });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl bg-purple-600 px-4 py-2 text-sm text-white">
                {messageText(message)}
              </div>
            </div>
          ) : (
            <div key={message.id} className="flex justify-start">
              <div className="prose prose-invert prose-sm max-w-[80%] rounded-2xl bg-zinc-700 px-4 py-2 text-sm text-white">
                <Streamdown components={markdownComponents}>
                  {messageText(message)}
                </Streamdown>
              </div>
            </div>
          ),
        )}
        {error && (
          <p className="text-center text-sm text-red-600">
            Ceva n-a mers. Încearcă din nou.
          </p>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-zinc-800 bg-background px-4 py-3">
        {atCap ? (
          <p className="text-center text-sm text-zinc-300">
            Ai atins limita de {MEMBER_MESSAGE_CAP} mesaje.{" "}
            <Link href="/" className="text-purple-700 underline">
              Începe o conversație nouă
            </Link>
            .
          </p>
        ) : (
          <>
            <div className="flex w-full items-end gap-2 rounded-2xl border border-zinc-600 bg-zinc-700 p-3">
              <textarea
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder="Spune ce ai nevoie…"
                className="flex-1 resize-none bg-transparent text-sm text-white outline-none placeholder:text-zinc-400"
              />
              <button
                type="button"
                onClick={submit}
                disabled={busy || !input.trim()}
                aria-label="Trimite"
                className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
              >
                Trimite
              </button>
            </div>
            <p className="mt-1 text-right text-xs text-zinc-500">
              {memberMessages}/{MEMBER_MESSAGE_CAP} mesaje
            </p>
          </>
        )}
      </div>
    </div>
  );
}
