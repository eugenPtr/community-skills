import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthedMenu } from "@/components/authed-menu";
import {
  listMembers,
  supabaseListMembersClient,
  type MemberCard,
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
    <>
      <AuthedMenu isAdmin={member.role === "admin"} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-semibold">Members</h1>
        <ul className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-4">
          {members.map((m) => (
            <Card key={m.id} member={m} isOwn={m.id === user.id} />
          ))}
        </ul>
      </main>
    </>
  );
}

function Card({ member, isOwn }: { member: MemberCard; isOwn: boolean }) {
  // Tapping your own card goes to your editable /profile; anyone else's to their
  // read-only /profile/{id}.
  const href = isOwn ? "/profile" : `/profile/${member.id}`;
  const heartProject = member.heartProjectSeeking
    ? "Seeking one"
    : member.heartProjectDescription;

  return (
    <li>
      <Link
        href={href}
        className="flex h-full flex-col rounded-xl border border-zinc-600 bg-zinc-700 p-4 transition hover:border-zinc-500 hover:shadow-sm"
      >
        <h2 className="font-semibold text-white">{member.name}</h2>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-zinc-300">
          Heart Project
        </p>
        <p className="mt-0.5 line-clamp-3 text-sm text-white">
          {heartProject}
        </p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-300">
          Skills
        </p>
        <p className="mt-0.5 line-clamp-3 text-sm text-white">
          {member.skills}
        </p>
      </Link>
    </li>
  );
}
