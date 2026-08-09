import type { SupabaseClient } from "@supabase/supabase-js";

export interface MemberResourcePreview {
  description: string;
  classification: "free" | "paid";
  position: number;
}

interface MemberCardRow {
  id: string;
  name: string;
  heartProjectDescription: string | null;
  heartProjectSeeking: boolean;
  resources: MemberResourcePreview[];
}

// One Member's card on the Members listing. Location, Passions and Social Links
// remain Profile-page-only (issue #17).
export interface MemberCard {
  id: string;
  name: string;
  heartProjectDescription: string | null;
  // The seeking flag, not the description, decides "Seeking one" on a card, so
  // the glossary's has-one-or-seeking distinction survives an empty description.
  heartProjectSeeking: boolean;
  resources: MemberResourcePreview[];
  resourceCount: number;
}

// The seam `listMembers` reads through: a Supabase client in production, a
// pglite adapter in tests. Both return the same unordered rows; ordering lives
// in `listMembers` so it is asserted once, independent of the data source.
export interface ListMembersClient {
  fetchMemberCards(): PromiseLike<{
    data: MemberCardRow[] | null;
    error: { message: string } | null;
  }>;
}

// Every Member as a card, ordered by name ascending, case-insensitive, so the
// Members listing is predictable to scan regardless of how names were capitalised.
export async function listMembers(
  client: ListMembersClient,
): Promise<MemberCard[]> {
  const { data, error } = await client.fetchMemberCards();
  if (error) throw new Error(`listMembers failed: ${error.message}`);
  return [...(data ?? [])]
    .map((member) => {
      const resources = [...member.resources].sort((a, b) => {
        if (a.classification !== b.classification) {
          return a.classification === "free" ? -1 : 1;
        }
        return a.position - b.position;
      });
      return {
        ...member,
        resources: resources.slice(0, 2),
        resourceCount: resources.length,
      };
    })
    .sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
    );
}

// Production adapter over the cookie-bound server client. RLS (ADR-0006) admits
// the read only when the caller is a Member, so a non-Member caller gets [].
export function supabaseListMembersClient(
  supabase: SupabaseClient,
): ListMembersClient {
  return {
    async fetchMemberCards() {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "member_id, first_name, last_name, heart_project_description, heart_project_seeking, resources(description, classification, position)",
        );
      return {
        data:
          data?.map((r) => ({
            id: r.member_id,
            name: `${r.first_name} ${r.last_name}`,
            heartProjectDescription: r.heart_project_description,
            heartProjectSeeking: r.heart_project_seeking,
            resources: r.resources,
          })) ?? null,
        error: error ? { message: error.message } : null,
      };
    },
  };
}
