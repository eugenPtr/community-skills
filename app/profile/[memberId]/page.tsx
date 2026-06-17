import { notFound, redirect } from "next/navigation";
import { AuthedMenu } from "@/components/authed-menu";
import { ProfileView } from "@/components/profile-view";
import { getProfile, supabaseGetProfileClient } from "@/lib/profile/get";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Another Member's read-only Profile (issue #17).
export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Never a second, read-only URL for myself: my own id redirects to /profile.
  if (memberId === user.id) redirect("/profile");

  // Member gate (story 30): only a true Member reads other Profiles.
  const { data: member } = await supabase
    .from("members")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!member) redirect("/");

  const profile = await getProfile(supabaseGetProfileClient(supabase), memberId);
  // Unknown id -> a broken or stale link fails cleanly as a 404.
  if (!profile) notFound();

  return (
    <>
      <AuthedMenu isAdmin={member.role === "admin"} />
      <ProfileView profile={profile} isOwn={false} />
    </>
  );
}
