import Link from "next/link";
import type { MemberCard as MemberCardData } from "@/lib/members/list";

export function MemberCard({ member, isOwn }: { member: MemberCardData; isOwn: boolean }) {
  const href = isOwn ? "/profile" : `/profile/${member.id}`;
  const heartProject = member.heartProjectSeeking
    ? "În căutare"
    : member.heartProjectDescription;
  const remainder = member.resourceCount - member.resources.length;

  return (
    <li>
      <Link
        href={href}
        className="flex h-full flex-col rounded-xl border border-zinc-600 bg-zinc-700 p-4 transition hover:border-zinc-500 hover:shadow-sm"
      >
        <h2 className="font-semibold text-white">{member.name}</h2>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-zinc-300">
          Resurse
        </p>
        <ul className="mt-0.5 space-y-1 text-sm text-white">
          {member.resources.map((resource) => (
            <li key={`${resource.classification}-${resource.position}`}>
              <span className="font-semibold">
                {resource.classification === "free" ? "Gratis:" : "Contra cost:"}
              </span>{" "}
              {resource.description}
            </li>
          ))}
        </ul>
        {remainder > 0 ? (
          <p className="mt-1 text-sm font-semibold text-zinc-300">+ încă {remainder}</p>
        ) : null}
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-zinc-300">
          Proiect de Suflet
        </p>
        <p className="mt-0.5 line-clamp-3 text-sm text-white">
          {heartProject}
        </p>
      </Link>
    </li>
  );
}
