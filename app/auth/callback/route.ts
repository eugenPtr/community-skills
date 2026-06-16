import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Magic-link callback: exchange the PKCE code for a session, then forward
// the invite code to /onboarding. Claim happens at onboarding submission,
// not here — see ADR-0004.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const authCode = url.searchParams.get("code");
  const inviteCode = url.searchParams.get("invite");

  if (authCode) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(authCode);
    if (error) {
      return NextResponse.redirect(
        new URL(
          `/sign-in?error=${encodeURIComponent(error.message)}`,
          request.url,
        ),
      );
    }
  }

  const dest = inviteCode
    ? `/onboarding?invite=${encodeURIComponent(inviteCode)}`
    : "/";
  return NextResponse.redirect(new URL(dest, request.url));
}
