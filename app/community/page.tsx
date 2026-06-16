import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthedMenu } from "@/components/authed-menu";
import {
  listMembers,
  supabaseListMembersClient,
  type MemberCard,
} from "@/lib/community/list";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function CommunityPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Member gate (issue #17, story 30): only a true Member reads the network.
  // RLS would also return nothing to a non-Member, but redirecting is clearer
  // than rendering an empty Community.
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!member) redirect("/");

  const members = await listMembers(supabaseListMembersClient(supabase));

  return (
    <>
      <AuthedMenu />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-semibold">Community</h1>
        <p className="mt-1 text-sm text-zinc-600">Everyone in the network.</p>
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
        className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm"
      >
        <h2 className="font-semibold">{member.name}</h2>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Heart Project
        </p>
        <p className="mt-0.5 line-clamp-3 text-sm text-zinc-700">
          {heartProject}
        </p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Skills
        </p>
        <p className="mt-0.5 line-clamp-3 text-sm text-zinc-700">
          {member.skills}
        </p>
      </Link>
    </li>
  );
}
