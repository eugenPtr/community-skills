import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import OnboardingForm from "./form";

type SearchParams = Promise<{ invite?: string }>;

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (member) {
    redirect("/");
  }

  const { invite } = await searchParams;

  if (!invite) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
        <h1 className="text-2xl font-semibold">No invite code</h1>
        <p className="text-sm text-zinc-600">
          Start from your invite link to join the network.
        </p>
      </main>
    );
  }

  return <OnboardingForm invite={invite} />;
}
