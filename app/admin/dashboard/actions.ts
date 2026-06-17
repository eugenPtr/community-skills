"use server";

import { redirect } from "next/navigation";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import {
  generateInvite,
  supabaseGenerateInviteClient,
} from "@/lib/invites/generate";

// Mint a new invite attributed to the acting Admin and return its code (the
// client builds the link and copies it). Re-verifies the caller is an Admin
// before writing -- the menu gate hides the route, this enforces it (ADR-0007).
// The Admin check runs on the cookie-bound client (is_admin() reads auth.uid());
// the insert runs on the service-role client, which bypasses RLS.
export async function generateInviteAction(): Promise<{ code: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  const service = createSupabaseServiceClient();
  const code = await generateInvite(supabaseGenerateInviteClient(service), {
    adminId: user.id,
  });

  return { code };
}
