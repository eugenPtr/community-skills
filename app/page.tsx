import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/sign-in");
  }

  const { data: member } = await supabase
    .from("members")
    .select("id, email")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (!member) {
    redirect("/claim");
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold">Welcome, {member.email}</h1>
      <p className="text-sm text-zinc-600">
        You're a Member. Directory and People Search land in later slices.
      </p>
    </main>
  );
}
