"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { submitOnboarding } from "@/lib/onboarding/submit";
import { gatewayEmbedder } from "@/lib/people-search/ai-gateway";
import { parseResourceLines } from "@/lib/resources/model";

export async function submitOnboardingAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) redirect("/sign-in");

  const code = String(formData.get("invite") ?? "").trim();
  const service = await createSupabaseServiceClient();
  const result = await submitOnboarding(
    {
      embedder: gatewayEmbedder,
      db: {
        async completeOnboarding(payload) {
          const { error } = await service.rpc("complete_onboarding", {
            p_user_id: payload.userId,
            p_email: payload.email,
            p_code: payload.code,
            p_profile: {
              first_name: payload.firstName, last_name: payload.lastName,
              location: payload.location, passions: payload.passions,
              heart_project_description: payload.heartProjectDescription ?? "",
              heart_project_seeking: payload.heartProjectSeeking,
              profile_context_embedding: JSON.stringify(payload.profileContextEmbedding),
              profile_context_embedding_input: payload.profileContextEmbeddingInput,
            },
            p_socials: payload.socials,
            p_resources: payload.resources.map((resource) => ({
              ...resource, embedding: JSON.stringify(resource.embedding),
            })),
          });
          return { error: error ? { code: error.code, message: error.message } : null };
        },
      },
    },
    {
      userId: data.user.id, email: data.user.email, code,
      firstName: String(formData.get("first_name") ?? "").trim(),
      lastName: String(formData.get("last_name") ?? "").trim(),
      location: String(formData.get("location") ?? "").trim(),
      passions: String(formData.get("passions") ?? "").trim(),
      heartProjectSeeking: formData.get("heart_project_seeking") === "true",
      heartProjectDescription: String(formData.get("heart_project_description") ?? "").trim() || undefined,
      resources: parseResourceLines(
        String(formData.get("free_resources") ?? ""),
        String(formData.get("paid_resources") ?? ""),
      ),
      socials: Object.fromEntries(["phone", "contact_email", "website", "linkedin", "facebook", "instagram", "x"].map((key) => [key === "contact_email" ? "email" : key, String(formData.get(key) ?? "")])),
    },
  );

  if (result.kind === "missingFields") redirect(`/onboarding?invite=${encodeURIComponent(code)}&error=missing-fields`);
  if (result.kind === "alreadyClaimed") redirect(`/onboarding?invite=${encodeURIComponent(code)}&error=already-claimed`);
  if (result.kind === "invalidCode") redirect(`/sign-in?invite=${encodeURIComponent(code)}`);
  return { kind: "ok" } as const;
}
