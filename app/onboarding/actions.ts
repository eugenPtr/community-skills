"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { submitOnboarding } from "@/lib/onboarding/submit";

export async function submitOnboardingAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) {
    redirect("/sign-in");
  }

  const code = String(formData.get("invite") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const skills = String(formData.get("skills") ?? "").trim();
  const passions = String(formData.get("passions") ?? "").trim();
  const heartProjectSeeking = formData.get("heart_project_seeking") === "true";
  const heartProjectDescription = String(formData.get("heart_project_description") ?? "").trim() || undefined;

  const service = await createSupabaseServiceClient();
  const result = await submitOnboarding(
    {
      async rpc(name_, args) {
        return service.rpc(name_, args);
      },
      async insertProfile(profile) {
        const { error } = await service.from("profiles").upsert({
          member_id: profile.memberId,
          name: profile.name,
          location: profile.location,
          skills: profile.skills,
          passions: profile.passions,
          heart_project_description: profile.heartProjectDescription,
          heart_project_seeking: profile.heartProjectSeeking,
        });
        return { error: error ? { message: error.message } : null };
      },
    },
    {
      userId: data.user.id,
      email: data.user.email,
      code,
      name,
      location,
      skills,
      passions,
      heartProjectSeeking,
      heartProjectDescription,
    },
  );

  if (result.kind === "missingFields") {
    redirect(`/onboarding?invite=${encodeURIComponent(code)}&error=missing-fields`);
  }
  if (result.kind === "alreadyClaimed") {
    redirect(`/onboarding?invite=${encodeURIComponent(code)}&error=already-claimed`);
  }
  if (result.kind === "invalidCode") {
    redirect(`/sign-in?invite=${encodeURIComponent(code)}`);
  }

  redirect("/");
}
