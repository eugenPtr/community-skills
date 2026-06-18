"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { submitOnboarding } from "@/lib/onboarding/submit";
import { embedMember, supabaseEmbedMemberClient } from "@/lib/people-search/embed-member";
import { gatewayEmbedder } from "@/lib/people-search/ai-gateway";

export async function submitOnboardingAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) {
    redirect("/sign-in");
  }

  const code = String(formData.get("invite") ?? "").trim();
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const skills = String(formData.get("skills") ?? "").trim();
  const passions = String(formData.get("passions") ?? "").trim();
  const heartProjectSeeking = formData.get("heart_project_seeking") === "true";
  const heartProjectDescription = String(formData.get("heart_project_description") ?? "").trim() || undefined;

  const socials = {
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("contact_email") ?? ""),
    website: String(formData.get("website") ?? ""),
    linkedin: String(formData.get("linkedin") ?? ""),
    facebook: String(formData.get("facebook") ?? ""),
    instagram: String(formData.get("instagram") ?? ""),
    x: String(formData.get("x") ?? ""),
  };

  const service = await createSupabaseServiceClient();
  const result = await submitOnboarding(
    {
      async rpc(name_, args) {
        return service.rpc(name_, args);
      },
      async insertProfile(profile) {
        const { error } = await service.from("profiles").upsert({
          member_id: profile.memberId,
          first_name: profile.firstName,
          last_name: profile.lastName,
          location: profile.location,
          skills: profile.skills,
          passions: profile.passions,
          heart_project_description: profile.heartProjectDescription,
          heart_project_seeking: profile.heartProjectSeeking,
        });
        return { error: error ? { message: error.message } : null };
      },
      async upsertSocials(row) {
        const { error } = await service.from("socials").upsert({
          member_id: row.memberId,
          phone: row.phone,
          email: row.email,
          website: row.website,
          linkedin: row.linkedin,
          facebook: row.facebook,
          instagram: row.instagram,
          x: row.x,
        });
        return { error: error ? { message: error.message } : null };
      },
    },
    {
      userId: data.user.id,
      email: data.user.email,
      code,
      firstName,
      lastName,
      location,
      skills,
      passions,
      heartProjectSeeking,
      heartProjectDescription,
      socials,
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

  // Embed the new Member so they are findable in People Search immediately
  // (story 27). Best-effort: a Gateway hiccup must not fail the join -- the
  // Profile is already saved and a re-embed can fill the vector in later.
  try {
    await embedMember(
      { embedder: gatewayEmbedder, db: supabaseEmbedMemberClient(service) },
      data.user.id,
    );
  } catch (e) {
    console.error("embedMember after onboarding failed:", e);
  }

  redirect("/");
}
