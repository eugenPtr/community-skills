import { type MemberProfile, type SocialKey } from "@/lib/profile/get";

// One presentational Profile, rendering both /profile and /profile/{memberId}.
// `isOwn` only adds the owner marker (and the future edit affordance); it never
// changes the data shown (issue #17).
const SOCIAL_LABELS: Record<SocialKey, string> = {
  phone: "Phone",
  email: "Contact email",
  website: "Website",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  instagram: "Instagram",
  x: "X",
};
// Display order matches the published order in lib/profile/get.
const SOCIAL_ORDER: SocialKey[] = [
  "phone",
  "email",
  "website",
  "linkedin",
  "facebook",
  "instagram",
  "x",
];

function socialHref(key: SocialKey, value: string): string | null {
  if (key === "phone") return `tel:${value.replace(/\s+/g, "")}`;
  if (key === "email") return `mailto:${value}`;
  if (/^https?:\/\//i.test(value)) return value;
  return null;
}

export function ProfileView({
  profile,
  isOwn,
}: {
  profile: MemberProfile;
  isOwn: boolean;
}) {
  const heartProject = profile.heartProjectSeeking
    ? "Seeking one"
    : profile.heartProjectDescription;
  const socialEntries = SOCIAL_ORDER.flatMap((key) => {
    const value = profile.socials[key];
    return value ? [{ key, value }] : [];
  });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-semibold">{profile.name}</h1>
        {isOwn && (
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
            You
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-zinc-300">{profile.location}</p>

      <section className="mt-8 space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-zinc-300">Skills</h2>
          <p className="mt-1 whitespace-pre-line text-sm text-white">
            {profile.skills}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-300">Passions</h2>
          <p className="mt-1 whitespace-pre-line text-sm text-white">
            {profile.passions}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-300">Heart Project</h2>
          <p className="mt-1 whitespace-pre-line text-sm text-white">
            {heartProject}
          </p>
        </div>

        {socialEntries.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-zinc-300">Reach them</h2>
            <ul className="mt-1 space-y-1">
              {socialEntries.map(({ key, value }) => {
                const href = socialHref(key, value);
                return (
                  <li key={key} className="text-sm text-white">
                    <span className="text-zinc-300">{SOCIAL_LABELS[key]}: </span>
                    {href ? (
                      <a
                        href={href}
                        className="text-white underline hover:text-zinc-300"
                        target={key === "phone" || key === "email" ? undefined : "_blank"}
                        rel="noreferrer"
                      >
                        {value}
                      </a>
                    ) : (
                      value
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
