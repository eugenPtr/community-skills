"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    redirect("/sign-in?error=missing-email");
  }

  const supabase = await createSupabaseServerClient();
  const requestHeaders = await headers();
  const origin =
    requestHeaders.get("origin") ?? requestHeaders.get("x-forwarded-host");
  const emailRedirectTo = origin
    ? `${origin.startsWith("http") ? origin : `https://${origin}`}/auth/callback`
    : undefined;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo },
  });
  if (error) {
    redirect(`/sign-in?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/sign-in?sent=1");
}
