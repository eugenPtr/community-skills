import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { claimInvite } from "@/lib/invites/claim";

// Magic-link callback: Supabase redirects here with a `code` param.
// We exchange it for a session, then either auto-claim the invite (if the
// `invite` param is present) or send the user to /claim to enter a code.
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

    if (inviteCode) {
      const { data } = await supabase.auth.getUser();
      if (data.user?.email) {
        const service = await createSupabaseServiceClient();
        const result = await claimInvite(service, {
          code: inviteCode,
          userId: data.user.id,
          email: data.user.email,
        });
        if (result.kind !== "ok") {
          const reason = result.kind === "alreadyClaimed" ? "already-claimed" : "invalid-code";
          return NextResponse.redirect(new URL(`/claim?error=${reason}`, request.url));
        }
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
  }

  return NextResponse.redirect(new URL("/claim", request.url));
}
