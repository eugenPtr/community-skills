import { redirect } from "next/navigation";
import { ResourceMaintenanceForm } from "@/components/resource-maintenance-form";
import { getProfile, supabaseGetProfileClient } from "@/lib/profile/get";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ResourceMaintenancePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const profile = await getProfile(supabaseGetProfileClient(supabase), user.id);
  if (!profile) redirect("/onboarding");
  return <ResourceMaintenanceForm initialResources={profile.resources} />;
}
