import { redirect } from "next/navigation";
import { AuthedMenu } from "@/components/authed-menu";
import { ProfileView } from "@/components/profile-view";
import { getProfile, supabaseGetProfileClient } from "@/lib/profile/get";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// The authed Member's own Profile -- the one place that is "me" and the future
// edit surface (issue #17).
export default async function OwnProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const profile = await getProfile(supabaseGetProfileClient(supabase), user.id);
  // No profile means onboarding never finished; home explains how to resume.
  if (!profile) redirect("/");

  return (
    <>
      <AuthedMenu />
      <ProfileView profile={profile} isOwn />
    </>
  );
}
