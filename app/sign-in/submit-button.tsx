"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ label = "Trimite linkul magic" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-purple-600 px-4 py-2 text-white disabled:opacity-50 hover:bg-purple-700"
    >
      {pending ? "Se trimite…" : label}
    </button>
  );
}
