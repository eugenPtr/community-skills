"use server";

import { redirect } from "next/navigation";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { claimInvite } from "@/lib/invites/claim";

export async function claimInviteAction(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) {
    redirect("/claim?error=missing-code");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    redirect("/sign-in");
  }
  const { user } = data;
  if (!user.email) {
    redirect("/sign-in?error=missing-email");
  }

  // The `claim_invite` function is revoked from the authenticated role and
  // only callable as service_role, so we use the service client here. The
  // server action has already verified the user above; we pass their id.
  const service = createSupabaseServiceClient();
  const result = await claimInvite(service, {
    code,
    userId: user.id,
    email: user.email,
  });

  if (result.kind === "invalid") {
    redirect("/claim?error=invalid-code");
  }
  if (result.kind === "alreadyClaimed") {
    redirect("/claim?error=already-claimed");
  }

  redirect("/");
}
