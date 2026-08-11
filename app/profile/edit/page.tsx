import { redirect } from "next/navigation";
import { ProfileEditor } from "@/components/profile-editor";
import { getProfile, supabaseGetProfileClient } from "@/lib/profile/get";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function EditProfilePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const [profile, communitiesResult] = await Promise.all([
    getProfile(supabaseGetProfileClient(supabase), user.id),
    supabase.from("affiliated_communities").select("id, name").order("name"),
  ]);
  if (!profile) redirect("/onboarding");
  return <ProfileEditor initial={profile} communities={communitiesResult.data ?? []} />;
}
