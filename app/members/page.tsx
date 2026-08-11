import { redirect } from "next/navigation";
import { MemberCard } from "@/components/member-card";
import {
  listMembers,
  supabaseListMembersClient,
} from "@/lib/members/list";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MembersPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Member gate (issue #17, story 30): only a true Member reads the network.
  // RLS would also return nothing to a non-Member, but redirecting is clearer
  // than rendering an empty Members listing.
  const { data: member } = await supabase
    .from("members")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!member) redirect("/");

  const members = await listMembers(supabaseListMembersClient(supabase));

  return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-semibold">Membri</h1>
        <ul className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-4">
          {members.map((m) => (
            <MemberCard key={m.id} member={m} isOwn={m.id === user.id} />
          ))}
        </ul>
      </main>
  );
}
