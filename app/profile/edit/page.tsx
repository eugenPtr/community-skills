import { redirect } from "next/navigation";
import { AuthedMenu } from "@/components/authed-menu";
import { ProfileEditor } from "@/components/profile-editor";
import { getProfile, supabaseGetProfileClient } from "@/lib/profile/get";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function EditProfilePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const [profile, communitiesResult, memberResult] = await Promise.all([
    getProfile(supabaseGetProfileClient(supabase), user.id),
    supabase.from("affiliated_communities").select("id, name").order("name"),
    supabase.from("members").select("role").eq("id", user.id).maybeSingle(),
  ]);
  if (!profile) redirect("/onboarding");
  return <><AuthedMenu isAdmin={memberResult.data?.role === "admin"} /><ProfileEditor initial={profile} communities={communitiesResult.data ?? []} /></>;
}
