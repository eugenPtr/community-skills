"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    redirect("/sign-in?error=missing-email");
  }

  const invite = String(formData.get("invite") ?? "").trim() || null;

  const supabase = await createSupabaseServerClient();
  const requestHeaders = await headers();
  // `Origin` includes the protocol; `x-forwarded-host` is just the host.
  const origin = requestHeaders.get("origin");
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const baseUrl =
    origin ?? (forwardedHost ? `https://${forwardedHost}` : undefined);
  const callbackPath = invite
    ? `/auth/callback?invite=${encodeURIComponent(invite)}`
    : "/auth/callback";
  const emailRedirectTo = baseUrl ? `${baseUrl}${callbackPath}` : undefined;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo },
  });
  if (error) {
    redirect(`/sign-in?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/sign-in?sent=1");
}
